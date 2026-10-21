export const providerModels=['claude-haiku-4-5','claude-opus-4-7','claude-opus-4-8','claude-opus-5','claude-opus-5-5','claude-sonnet-5','claude-haiku-4.5','deepseek-3.2-thinking','claude-sonnet-5-5','claude-opus-4-6','claude-sonnet-4-6'];
export type Capability='editing'|'vision'|'lyrics';
export type CapabilityResult={status:'passed'|'failed'|'not-configured';detail:string;checkedAt:number};
export type ConnectionTest={id:string;status:'queued'|'running'|'complete'|'error';createdAt:number;updatedAt:number;results:Partial<Record<Capability,CapabilityResult>>;error?:string;attempts:number};
export const capabilityReady=(test:ConnectionTest|undefined,kind:Capability)=>test?.status==='complete'&&test?.results[kind]?.status==='passed';
