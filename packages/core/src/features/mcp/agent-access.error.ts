/** Something an agent asked for that Chaff cannot give; the message is shown to the agent as it is. */
export class AgentAccessError extends Error {
  public override readonly name = 'AgentAccessError';
}
