import { MbacsaClient } from "mbacsa-client-2"
import { AgentInfo, extractPathToPodServer, generatePerformanceResult } from "../util/util.js"


export type MbacsaPerformanceReport = {
  iterations:number,
  minting:PerformanceResult,
  delegating:PerformanceResult,
  discharging:PerformanceResult,
  authorizing:PerformanceResult,
  revoking:PerformanceResult
}


export const emptyPerformanceResult:PerformanceResult = {
  max_time: 0,
  min_time:0,
  avg_time:0,
  std_dev:0
}

export type PerformanceResult = {
  max_time:number,
  min_time:number,
  std_dev:number,
  avg_time:number
}

export type MainConfigurationInfo = {
  targetEndpoint:string,
  agent1Info:AgentInfo, 
  agent2Info:AgentInfo, 
  agent3Info:AgentInfo,
  iterations:number
}



export async function runMainPerformanceExperiments(config:MainConfigurationInfo):Promise<MbacsaPerformanceReport>{
  const {targetEndpoint, agent1Info, agent2Info, agent3Info, iterations} = config;
  // Agents
  const {webId: agent1} = agent1Info;
  const {webId: agent2, email:emailAgent2, password: pwAgent2} = agent2Info;
  const {webId: agent3, email:emailAgent3, password: pwAgent3} = agent3Info;

  let report:MbacsaPerformanceReport = {
    iterations: iterations,
    minting: emptyPerformanceResult,
    delegating: emptyPerformanceResult,
    discharging: emptyPerformanceResult,
    authorizing: emptyPerformanceResult,
    revoking: emptyPerformanceResult
  };
  // Data for measuring performance
  let mintResponseTimes:number[] = [];
  let dischargeResponseTimes:number[] = [];
  let delegationResponseTimes:number[] = [];
  let authorizitionResponseTimes:number[] = [];
  let revocationResponseTimes:number[] = [];
  // Run experiments
  const client = new MbacsaClient();
  for(let i = 0 ; i < iterations ; i++){
    // Agent 2 minting macaroon for target resource, located at pod of agent1
    const dKeyAgent2 = await client.getPublicDischargeKey(agent2);
    const dpopTokenAgent2 = await client.retrieveDPoPToken(extractPathToPodServer(agent2), emailAgent2,pwAgent2);
    const startMintTime = process.hrtime();
    const mintResponse = await client.mintDelegationToken(agent2,
      {
        dischargeKey: dKeyAgent2.dischargeKey,
        mode: 'read',
        requestor: agent2,
        resourceURI: extractPathToPodServer(agent1) + targetEndpoint
      },dpopTokenAgent2)
    const endMintTime = process.hrtime(startMintTime);
    const elapsedMintTimeMicroSec = endMintTime[0] * 1e6 + endMintTime[1] / 1e3;
    mintResponseTimes.push(elapsedMintTimeMicroSec);

  // Agent 2 discharging third-party caveat, encompassed in minted macaroon
  const startDischargeTime = process.hrtime();
  const dischargeResponseAgent2 = await client.dischargeDelegationToken(agent2,{
    agentToDischarge: agent2,
    serializedRootMacaroon: mintResponse.mintedMacaroon,
    mode: 'read'
  },dpopTokenAgent2) 
  const endDischargeTime = process.hrtime(startDischargeTime);
  const elapsedDischargeTimeMicroSec = endDischargeTime[0] * 1e6 + endDischargeTime[1] / 1e3;
  dischargeResponseTimes.push(elapsedDischargeTimeMicroSec)

  // Agent 2 delegates 'read' access to Agent 3
  const startDelegationTime = process.hrtime()
  const delegatedMacaroonAgent3 = await client.delegateAccessTo(mintResponse.mintedMacaroon,agent3);
  const endDelegationTime = process.hrtime(startDelegationTime)
  const elapsedDelegationTimeMicroSec = endDelegationTime[0] * 1e6 + endDelegationTime[1] / 1e3;
  delegationResponseTimes.push(elapsedDelegationTimeMicroSec);
  // Agent 3 discharges delegation from Agent 2
  const dpopTokenAgent3 = await client.retrieveDPoPToken(extractPathToPodServer(agent3),emailAgent3,pwAgent3);
  const dischargeResponseAgent3 = await client.dischargeDelegationToken(agent3,{
    agentToDischarge:agent3,
    serializedRootMacaroon:delegatedMacaroonAgent3},dpopTokenAgent3)
  
  // Agent 3 accesses target resource via MBACSA
  const startAuthorizingTime = process.hrtime()
  const resource = await client.accessWithDelegationToken(extractPathToPodServer(agent1) + targetEndpoint,
    [delegatedMacaroonAgent3,dischargeResponseAgent2.dischargeMacaroon,dischargeResponseAgent3.dischargeMacaroon])
  const endAuthorizingTime = process.hrtime(startAuthorizingTime);
  const elapsedAuthorizingTimeMicroSec = endAuthorizingTime[0] * 1e6 + endAuthorizingTime[1] / 1e3;
  authorizitionResponseTimes.push(elapsedAuthorizingTimeMicroSec)

  // Agent 2 revokes Agent 3's access to the target resource
  const startRevocationTime = process.hrtime();
  const revocationResponse = await client.revokeDelegationToken({
    revoker:agent2,
    revokee:agent3,
    serializedMacaroons: [mintResponse.mintedMacaroon,dischargeResponseAgent2.dischargeMacaroon]
  },dpopTokenAgent2)

  const endRevocationTime = process.hrtime(startRevocationTime);
  const elapsedRevocationTimeMicroSec = endRevocationTime[0] * 1e6 + endRevocationTime[1] / 1e3;
  revocationResponseTimes.push(elapsedRevocationTimeMicroSec);

  }

  // Construct Performance report
  report.minting = generatePerformanceResult(mintResponseTimes);
  report.delegating = generatePerformanceResult(delegationResponseTimes)
  report.discharging = generatePerformanceResult(dischargeResponseTimes);
  report.authorizing = generatePerformanceResult(authorizitionResponseTimes);
  report.revoking = generatePerformanceResult(revocationResponseTimes);
  
  return report;
}