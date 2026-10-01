/* ============================================================================
   EMBED MODE — this sheet, hosted inside the Unified Inbox
   ----------------------------------------------------------------------------
   The inbox already supplies the furniture around a sales invoice: the source
   document on the left, the title and the cohort pager above, and Convert /
   Delete / Save draft / Approve & Next below. So when this file is loaded with
   ?embed=1 it drops its own topbar and renders the sheet alone, and the two
   halves talk over postMessage.

   Nothing above this block knows it is embedded. Opening index.html directly
   behaves exactly as it did — this is additive, and the guard is the first
   line of it.

   The shape is the AP sheet's, deliberately: two sheets in one inbox that
   answer different protocols would be two things to remember. What differs is
   what the two sheets are, and there is one difference worth naming here.

   The AP sheet owns a document pane, because a bill is *read off* a supplier's
   paper. This one has none — standalone, an invoice is raised rather than read,
   and the form is the whole workspace. Under the inbox there IS a source
   document, so the inbox keeps its own preview beside the sheet and the sheet
   stays what it is. That is why there is no `preview` message here and no
   `--topbar-h` sticky-offset fix for a pane that does not exist.

   The inbox sends:
     seed       {customerName, invoiceNo, invoiceDate, lines, …} — a SAMPLE-
                shaped document; the real extraction pipeline runs on it, so
                every prediction, HSN call and threshold test is the same one
                the standalone sheet makes.
     approve    press Create Invoice
     saveDraft  hold the draft against this inbox item
     discard    press Discard

   This sheet sends back:
     ready      the sheet is up and listening
     totals     after every render, so the inbox header can show the figure
     dirty      something was edited — the inbox marks the item unsaved
     approved   the invoice was created
   ========================================================================== */
(function(){
  const params = AR_PARAMS;
  if(params.get('embed') !== '1') return;

  /* --- one live engine at a time -----------------------------------------
     Only the newest evaluation drives the sheet; see arLive() at the top of
     this file for why there is more than one. Without this, paging through
     four invoices left four engines alive on the same ids in the same
     document, and every one of them answered the next seed. */
  const current = arLive;

  /* A draft belongs to the inbox item it was opened from, not to the browser.
     One shared key would restore item 2041's draft over item 2042's sheet. */
  const itemId = params.get('item') || '';
  if(itemId) DRAFT_KEY = 'aia.ar.draft.v2:' + itemId;

  const post = (type, payload) =>
    parent.postMessage({source:'aia-ar', type, payload}, '*');

  /* --- what the inbox already draws, this sheet stops drawing -------------
     Only the topbar. It held the title and Discard / Create Invoice, and the
     inbox supplies both — the title with the cohort pager above, the actions
     in the footer below. */
  /* These rules have to out-rank the sheet's own stylesheet in both the places
     this block runs. Loaded into the inbox's document that stylesheet is
     scoped — every selector sits under .ar-sheet — so a bare `.topbar` is a
     weaker selector than `.ar-sheet .topbar` and lost, and `:root{--topbar-h}`
     was shadowed outright by the `--topbar-h` the wrapper itself declares.
     Hence !important on the hide, and the wrapper named alongside :root for
     the variable. In an iframe there is no wrapper and the :root half still
     does the work, so one block covers both. */
  const style = document.createElement('style');
  style.textContent = `
    .topbar{display:none!important}
    /* Nothing here is sticky under the topbar — there is no document pane to
       offset — but the variable is read in a handful of measurements, and a
       51px allowance for a bar that is not drawn is 51px of nothing. */
    :root,.ar-sheet{--topbar-h:0px}
    /* Two surfaces are pinned to the bottom of the viewport — the line-item
       bulk bar and the toast stack — from when this sheet owned the window.
       That band is the inbox's footer now, so both clear it by the footer's
       own measured height (published as --inbox-footer-h by the Footer
       component). The 24 / 16 / 93 are the sheet's own offsets, kept and added
       to rather than replaced, so the spacing it was tuned with survives. */
    .ar-sheet .bulkbar{bottom:calc(24px + var(--inbox-footer-h, 0px))}
    .ar-sheet .toasts{bottom:calc(16px + var(--inbox-footer-h, 0px))}
    .ar-sheet.has-bulkbar .toasts{bottom:calc(93px + var(--inbox-footer-h, 0px))}
  `;
  document.head.append(style);

  /* --- resolving what the inbox names ------------------------------------
     The inbox holds parties and ledgers as the names printed on a document;
     this sheet holds them as masters with ids. Matching happens here rather
     than in the inbox because the book is here — the inbox has no way to know
     which of these names this company actually keeps a master for.

     Nothing is forced. A name with no master resolves to '', which is a state
     the sheet is built for: several of its own sample lines arrive with the
     ledger cell empty and offer to create one. */
  const norm = s => String(s||'').trim().toLowerCase();
  const byName = (list, name) => {
    const want = norm(name);
    if(!want) return null;
    return list.find(x => norm(x.name) === want)
        || list.find(x => norm(x.name).startsWith(want))
        || null;
  };

  /* --- seeding ----------------------------------------------------------- */
  /* The inbox hands over what its extraction read.

     Built field by field rather than as `{...SAMPLE, ...doc}`, which is how the
     AP sheet does it and is wrong for this one. The bills sheet's sample is a
     bill whose every field the inbox also supplies, so a spread is a total
     replacement. This sheet's sample is a *demonstration* — it carries a
     customer PO number, a consignee, a delivery note, a narration about a
     desktop refresh — and an inbox invoice supplies none of those. Spread, they
     survive: the screen printed PO/ANV/2026/0442 on an oil invoice from a
     customer who never raised it, which is an invented fact on a voucher about
     to be posted.

     So only three values carry over, and each because it is the company's
     rather than the document's: which of our branches supplies, that a sale is
     a sale, and the sales ledger it posts to when the customer master names
     none. Everything else is the inbox's or is empty. */
  function seed(doc){
    if(!doc) return;
    const base = SAMPLE;

    /* The customer, resolved against this book. A match is picked the way the
       user would have picked it and everything downstream — address, GSTIN,
       treatment, their state, their credit period — is read off the master.
       No match leaves the field empty and hands the printed header to
       `printedCustomer`, which is the state this sheet already keeps for
       exactly this: the evidence a new customer master would be built from. */
    const customerMatch = matchCustomer({name:doc.customerName, gstin:doc.customerGstin});
    const customer = customerMatch ? byId(MASTERS.customers, customerMatch.id) : null;

    const lines = Array.isArray(doc.lines) && doc.lines.length
      ? doc.lines.map(l => ({
          text:   l.text || '',
          hsn:    l.hsn || '',
          amount: l.amount,
          gst:    l.gst == null ? 18 : l.gst,
          route:  'ledger',
          /* Income first: a sales invoice's own lines are income heads, and
             the sales ledger is the one the voucher posts against, not the one
             a line names. */
          ledger: (byName(MASTERS.incomeLedgers, l.ledger)
                || byName(MASTERS.salesLedgers,  l.ledger)
                || {}).id || ''
        }))
      : base.lines;

    SAMPLE = {
      /* the company's, not the document's */
      branch:          base.branch,
      voucherType:     base.voucherType,
      salesLedger:     base.salesLedger,

      customer:        customer ? customer.id : '',
      invoiceDate:     doc.invoiceDate || '',
      narration:       doc.narration || '',
      /* Blank, not the sample's. A cost centre class is a decision about how
         this voucher is split, and the inbox states it on `context.form` if it
         has one — see the bridge below. */
      costCentreClass: '',
      customerPoNo:    doc.customerPoNo || '',
      /* The optional groups are switched on by what the document carries. An
         inbox invoice carries none of them, so none of them appear — rather
         than the sample's consignee and delivery note appearing on every
         invoice the queue opens. */
      extra:           doc.extra || {},
      lines
    };
    applyExtraction(null);

    /* A few values the extraction cannot reach on its own, because it reads
       them off a master this book may not hold. */
    if(!customer && doc.customerName){
      state.printedCustomer = {
        name:  doc.customerName,
        gstin: doc.customerGstin || '',
        pan:   doc.customerPan || ''
      };
      /* And offered as a master this invoice would add, rather than left as a
         blank required field with nothing to say about itself. This is the
         sheet's own shape for an unmatched party — a proposal on the field,
         carrying its reason, with the `+` beside it that writes it — and the
         alternative was a Select Customer the reader has to work out for
         themselves is unanswerable. */
      state.customerSuggestion = draftCustomer(state.printedCustomer);
      state.customerPredReason =
        'the invoice names this customer, and this book has no master for them';
      refreshCustomerList();
    }
    /* The due date is the document's, not the credit period's, when the
       document states one; and the place of supply is a column in the upload
       rather than something derivable from a GSTIN — a row whose GSTIN is
       missing still states which state it went to. */
    if(doc.dueDate)        state.dueDate   = doc.dueDate;
    if(doc.placeOfSupply)  state.destState = doc.placeOfSupply;
    if(doc.voucherNo)      state.voucherNo = doc.voucherNo;

    /* Item Mode bills stock, and stock is quantities, units and rates. An
       inbox extraction carries a description and an amount — that is a ledger
       line, and Accounting Mode is the view built for it. Switched with the
       sheet's own setMode so the fold happens as it does for a user, rather
       than by assigning state.mode and leaving the two tables disagreeing. */
    if(state.customer || state.customerSuggestion) runPredictions();
    const hasStock = state.items.some(r => r.item || num(r.qty) || num(r.rate));
    if(!hasStock) setMode('accounting');

    render();
  }

  /* --- render → totals --------------------------------------------------- */
  /* Wrapped rather than called from each site: every path that changes a
     figure already ends in render(), so this is the one place the inbox can
     be told without hunting for the others. */
  const innerRender = render;
  render = function(){
    const calc = innerRender.apply(this, arguments);
    if(calc) post('totals', {
      subTotal: calc.subTotal, gstTotal: calc.gstTotal,
      dedTotal: calc.dedTotal, adjTotal: calc.adjTotal, grand: calc.grand,
      voucherNo: state.voucherNo,
      invoiceNo: state.voucherNo,
      customer: (byId(MASTERS.customers,state.customer)
              || state.customerSuggestion
              || state.printedCustomer || {}).name || ''
    });
    return calc;
  };

  /* --- inbound ----------------------------------------------------------- */
  addEventListener('message', (ev)=>{
    if(!current()) return;   /* superseded: the seed is not ours to answer */
    const msg = ev.data;
    /* `aia-inbox-ar`, not `aia-inbox`. The two sheets are siblings built from
       the same file, so this listener and the bills sheet's are the same
       listener on the same document — and for as long as a route switch is
       settling, both engines are in it. Under one shared name each answered
       the other's seed: the bills engine ran an invoice through its own
       applyExtraction against a DOM that had been unmounted under it, and
       threw on the first node it reached for. A name per sheet is what makes a
       message addressed rather than broadcast.

       The generation gate above is the other half and not a substitute: it
       stops a *superseded* engine, and during the swap there is a moment when
       both are current. */
    if(ev.source!==parent||ev.origin!==location.origin||!msg || msg.source !== 'aia-inbox-ar') return;
    if(msg.type === 'seed')      seed(msg.payload);
    if(msg.type === 'approve')   $('#btn-allocate')?.click();
    if(msg.type === 'saveDraft'){ saveDraft(); toast('Draft saved'); }
    if(msg.type === 'discard')   $('#btn-discard')?.click();
    /* A hand-raised invoice: the sheet's own fresh state, without the sample
       figures reset() lays back in. There is no document to seed it from. */
    if(msg.type === 'blank'){
      state = freshState(); nmDraft = null;
      refreshItemsList(); refreshCustomerList(); refreshSalesLedgerList();
      render();
    }
  });

  /* An edit anywhere in the sheet is an edit — the inbox only needs to know
     that one happened, not what it was. */
  let dirty = false;
  const markDirty = ()=>{ if(!current()) return; if(!dirty){ dirty = true; post('dirty'); } };
  addEventListener('input',  markDirty, true);
  addEventListener('change', markDirty, true);

  /* Create Invoice is the sheet's own button; the inbox's Approve presses it,
     and either way the inbox is told the invoice was made. */
  document.addEventListener('click', (ev)=>{
    if(!current()) return;
    if(ev.target.closest('#btn-allocate')) setTimeout(()=>{
      if(state.allocated) post('approved', {voucherNo: state.voucherNo});
    }, 0);
  }, true);

  /* Announced once. Posting on both `load` and immediately seeded the sheet
     twice, which ran the extraction twice and stacked two identical toasts. */
  if(document.readyState === 'complete') queueMicrotask(()=>{ if(current()) post('ready'); });
  else addEventListener('load', ()=>{ if(current()) post('ready'); }, {once:true});
})();


/* PRD v2 bridge: local draft state and reviewed values belong to an Inbox item. */
(function(){
 if(AR_PARAMS.get('inboxv2')!=='1')return;
 /* Same generation gate — see arLive() at the top of this file. A superseded
    bridge must stop writing snapshots most of all: it would keep pushing the
    previous invoice's form onto whichever item is open now. */
 const current = arLive;
 let context=null, sent='', readyForSnapshots=false;
 const post=(type,payload)=>parent.postMessage({source:'aia-ar-v2',type,payload},location.origin);
 /* The invoice's lines, as the inbox's flat `form.lines` — one row per thing
    billed, whichever table it is sitting in. Sales credits, so `cr` carries
    the amount and `dr` is zero; the AP bridge is the mirror of this. */
 const snapLines=()=>{
  const out=[];
  const salesName=byId(MASTERS.salesLedgers,state.salesLedger)?.name||'';
  if(state.mode==='item')
   state.items.filter(r=>num(r.qty)*num(r.rate)||num(r.amountOverride)).forEach(r=>{
    const amt=num(r.amountOverride)||r2(num(r.qty)*num(r.rate));
    out.push({description:r.description||'',ledger:salesName,amount:amt,dr:0,cr:amt,costCentre:r.costCentre||''});
   });
  state.ledgers.filter(r=>num(r.amount)).forEach(r=>{
   const amt=num(r.amount);
   out.push({description:r.description||'',ledger:ledgerNameOf(r.ledger)||salesName,amount:amt,dr:0,cr:amt,costCentre:r.costCentre||''});
  });
  return out;
 };
 const snapshot=()=>{
  if(!current())return;
  if(!readyForSnapshots||!context)return;
  const calc=compute();
  const party=(byId(MASTERS.customers,state.customer)||state.customerSuggestion||state.printedCustomer||{}).name||'';
  const payload={
   sheet:JSON.parse(JSON.stringify({...state,__drafted:state.newMasters.map(m=>({kind:m.kind,master:(NM_LIST[m.kind]?.()||[]).find(x=>x.id===m.id)})).filter(d=>d.master)})),
   form:{
    gst:byId(MASTERS.branches,state.branch)?.name||'',
    voucherType:byId(MASTERS.voucherTypes,state.voucherType)?.name||state.voucherType,
    voucherNo:state.voucherNo||previewVoucherNo(),
    /* Our own invoice number. On a sale there is no supplier's equivalent —
       the field the AP sheet fills from the vendor's paper is the number this
       voucher is about to be given, so the two agree on one name. */
    invoiceNo:state.voucherNo||previewVoucherNo(),
    date:state.invoiceDate,
    due:state.dueDate,
    party,
    costClass:state.costCentreClass,
    costCentre:state.invoiceCostCentre,
    narration:state.narration,
    lines:snapLines()
   },
   amount:calc.grand};
  const key=JSON.stringify(payload);if(key!==sent){sent=key;post('snapshot',payload);}
 };
 const originalExtract=applyExtraction;
 applyExtraction=function(){
  const result=originalExtract.apply(this,arguments);
  if(context){
   if(context.sheet){for(const d of context.sheet.__drafted||[]){const list=NM_LIST[d.kind]?.();if(list&&d.master&&!list.some(x=>x.id===d.master.id))list.push(d.master);}state=JSON.parse(JSON.stringify(context.sheet));state.allocated=false;delete state.reverseCharge;if(state.voucherType==='sales-rcm')state.voucherType='sales';if(state.salesLedger==='led-sales-rcm')state.salesLedger='led-sales-local';refreshCustomerList();refreshItemsList();refreshSalesLedgerList();}
   else if(context.manual){state=freshState();state.document={name:context.fileName};state.voucherType='sales';state.voucherNo=context.form?.voucherNo||'';}
   else if(context.form){
    state.voucherNo=context.form.voucherNo;state.invoiceDate=context.form.date;state.dueDate=context.form.due;state.costCentreClass=context.form.costClass;state.invoiceCostCentre=context.form.costCentre;
   }
   readyForSnapshots=true;render();snapshot();
  }
  return result;
 };
 /* The sheet flags one state with a class on document.body — has-bulkbar, so
    the toast stack steps up rather than covering Apply. Its rule is written as
    `body.has-bulkbar`, and under the inbox the sheet's CSS is scoped, which
    rewrites that to `.ar-sheet.has-bulkbar` — a selector a class on <body> can
    never satisfy.

    Mirroring onto the wrapper is the fix, and it is done with an observer
    rather than by wrapping the function that sets the flag: the list of flags
    is upstream's to grow, and the next one added there should work here
    without anyone remembering this file exists. Body keeps its own class, so
    standalone behaviour is untouched. */
 (function(){
  const wrap = document.querySelector('.ar-sheet');
  if(!wrap) return;   /* not embedded — `body.x` matches body, as written */
  const sync = () => ['has-bulkbar'].forEach(c =>
   wrap.classList.toggle(c, document.body.classList.contains(c)));
  sync();
  const obs = new MutationObserver(()=>{
   /* Disconnects itself once superseded, rather than leaving one observer per
      invoice ever opened all writing the same class. */
   if(!current()){ obs.disconnect(); return; }
   sync();
  });
  obs.observe(document.body, {attributes:true, attributeFilter:['class']});
 })();
 const originalRender=render;render=function(){const result=originalRender.apply(this,arguments);queueMicrotask(snapshot);return result;};
 const originalAllocate=allocateNow;allocateNow=function(){const result=originalAllocate.apply(this,arguments);snapshot();post('approved',{voucherNo:state.voucherNo});return result;};
 addEventListener('message',ev=>{
  if(!current())return;
  /* Addressed to this sheet, for the reason given on the embed block's
     listener above. */
  if(ev.source!==parent||ev.origin!==location.origin||ev.data?.source!=='aia-inbox-ar-v2')return;
  const {type,payload}=ev.data;
  if(type==='context'){
   context=payload;
   MASTERS.branches.forEach(b=>{b.name=b.name.replace('Karbon Business',context.company);});
   $('[data-bind="branch"]').innerHTML=options(MASTERS.branches,'Select Location',state.branch);
   refreshCustomerList();
   const style=document.createElement('style');style.textContent='.inbox-edited{color:#8a5300;font-size:11px}';document.head.append(style);
  }
 });
 document.addEventListener('change',ev=>{if(!current())return;post('edited',{field:ev.target.dataset.bind||'lines'});const field=ev.target.closest('.field');if(field&&!field.querySelector('.inbox-edited')){const tag=document.createElement('span');tag.className='inbox-edited';tag.textContent='Edited by you';field.append(tag);}setTimeout(snapshot,0);});
})();
