/**
 * Whether Neo says out loud that it is a prototype ("Scripted prototype",
 * "nothing leaves the prototype"). Off for stakeholder demos, where those
 * notes read as product copy; on when testing, to keep it honest about what
 * is simulated. Sends and replies are simulated either way.
 *
 * DEV: delete with the scripted runtime.
 */
export const NEO_DEMO_NOTES = false;

/** The note, only while demo notes are on. */
export const demoNote = (text: string) => (NEO_DEMO_NOTES ? text : "");
