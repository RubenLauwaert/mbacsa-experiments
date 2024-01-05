import { MbacsaClient } from "mbacsa-client"
import { AgentInfo, PerformanceResult, emptyPerformanceResult, extractPathToPodServer, generatePerformanceResult } from "../util/util.js"
import * as fs from 'fs';
import path from 'path';




export type MbacsaPerformanceReport = {
  iterations:number,
  keyRetrieval:PerformanceResult,
  minting:PerformanceResult,
  delegating:PerformanceResult,
  discharging:PerformanceResult,
  authorizing:PerformanceResult,
  revoking:PerformanceResult
}




export type CoreOpsConfigurationInfo = {
  targetEndpoint:string,
  agent1Info:AgentInfo, 
  agent2Info:AgentInfo, 
  agent3Info:AgentInfo,
  iterations:number
}


/**
 * Runs the core operation performance experiments based on the provided configuration.
 * @param config The core operations configuration for the performance experiments.
 * @returns A promise that resolves to a MbacsaPerformanceReport.
 */
export async function runMainPerformanceExperiments(config:CoreOpsConfigurationInfo):Promise<MbacsaPerformanceReport>{
  const {targetEndpoint, agent1Info, agent2Info, agent3Info, iterations} = config;
  // Agents
  const {webId: agent1} = agent1Info;
  const {webId: agent2, email:emailAgent2, password: pwAgent2} = agent2Info;
  const {webId: agent3, email:emailAgent3, password: pwAgent3} = agent3Info;

  let report:MbacsaPerformanceReport = {
    iterations: iterations,
    keyRetrieval: emptyPerformanceResult,
    minting: emptyPerformanceResult,
    delegating: emptyPerformanceResult,
    discharging: emptyPerformanceResult,
    authorizing: emptyPerformanceResult,
    revoking: emptyPerformanceResult
  };
  // Data for measuring performance
  let retrievalResponseTimes:number[] = [];
  let mintResponseTimes:number[] = [];
  let dischargeResponseTimes:number[] = [];
  let delegationResponseTimes:number[] = [];
  let authorizitionResponseTimes:number[] = [];
  let revocationResponseTimes:number[] = [];
  // Run experiments
  const client = new MbacsaClient();
  for(let i = 0 ; i < iterations ; i++){

    // Retrieve discharge key for minter
    const startRetrievalTime = process.hrtime();
    const dKeyAgent2 = await client.getPublicDischargeKey(agent2);
    const endRetrievalTime = process.hrtime(startRetrievalTime);
    const elapsedRetrievalTimeMicroSec = endRetrievalTime[0] * 1e6 + endRetrievalTime[1] / 1e3;
    retrievalResponseTimes.push(elapsedRetrievalTimeMicroSec);

    // Agent 2 minting macaroon for target resource, located at pod of agent1
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
  const dischargeResponseAgent2 = await client.dischargeLastThirdPartyCaveat(mintResponse.mintedMacaroon,agent2,dpopTokenAgent2)
  const endDischargeTime = process.hrtime(startDischargeTime);
  const elapsedDischargeTimeMicroSec = endDischargeTime[0] * 1e6 + endDischargeTime[1] / 1e3;
  dischargeResponseTimes.push(elapsedDischargeTimeMicroSec)

  // Agent 2 delegates 'read' access to Agent 3
  const pdkAgent3 = await client.getPublicDischargeKey(agent3)
  const startDelegationTime = process.hrtime()
  const delegatedMacaroonAgent3 = await client.delegateAccessTo(mintResponse.mintedMacaroon,agent3,pdkAgent3.dischargeKey);
  const endDelegationTime = process.hrtime(startDelegationTime)
  const elapsedDelegationTimeMicroSec = endDelegationTime[0] * 1e6 + endDelegationTime[1] / 1e3;
  delegationResponseTimes.push(elapsedDelegationTimeMicroSec);
  // Agent 3 discharges delegation from Agent 2
  const dpopTokenAgent3 = await client.retrieveDPoPToken(extractPathToPodServer(agent3),emailAgent3,pwAgent3);
  const dischargeResponseAgent3 = await client.dischargeLastThirdPartyCaveat(delegatedMacaroonAgent3,agent3,dpopTokenAgent3);
  
  // Agent 3 accesses target resource via MBACSA
  const startAuthorizingTime = process.hrtime()
  const resource = await client.accessWithDelegationToken(extractPathToPodServer(agent1) + targetEndpoint,
    [delegatedMacaroonAgent3,dischargeResponseAgent2.dischargeMacaroon,dischargeResponseAgent3.dischargeMacaroon])
  const endAuthorizingTime = process.hrtime(startAuthorizingTime);
  const elapsedAuthorizingTimeMicroSec = endAuthorizingTime[0] * 1e6 + endAuthorizingTime[1] / 1e3;
  authorizitionResponseTimes.push(elapsedAuthorizingTimeMicroSec)

  // Agent 2 revokes Agent 3's access to the target resource
  const startRevocationTime = process.hrtime();
  const revocationResponse = await client.revokeDelegationToken(agent2,agent3,[mintResponse.mintedMacaroon,dischargeResponseAgent2.dischargeMacaroon])

  const endRevocationTime = process.hrtime(startRevocationTime);
  const elapsedRevocationTimeMicroSec = endRevocationTime[0] * 1e6 + endRevocationTime[1] / 1e3;
  revocationResponseTimes.push(elapsedRevocationTimeMicroSec);

  }

  // Construct Performance report
  report.keyRetrieval = generatePerformanceResult(retrievalResponseTimes)
  report.minting = generatePerformanceResult(mintResponseTimes);
  report.delegating = generatePerformanceResult(delegationResponseTimes)
  report.discharging = generatePerformanceResult(dischargeResponseTimes);
  report.authorizing = generatePerformanceResult(authorizitionResponseTimes);
  report.revoking = generatePerformanceResult(revocationResponseTimes);
  
  return report;
}

/**
 * Writes the core performance results to a file.
 * @param config The main configuration for the performance experiments.
 * @param filePath The file path to write the results to.
 * @returns A promise that resolves when the results are written to the file.
 */
export async function writeCorePerformanceResultsToFile(config: CoreOpsConfigurationInfo, filePath: string): Promise<void> {
  try {
    // Assuming runMainPerformanceExperiment returns the performanceResult
    const performanceResult = await runMainPerformanceExperiments(config);

    // Ensure that the directory exists
    const dirPath = path.dirname(filePath);
    fs.mkdirSync(dirPath, { recursive: true });

    // Convert the array to JSON string
    const jsonData = JSON.stringify(performanceResult, null, 2);

    // Write the JSON data to the file
    fs.writeFileSync(filePath, jsonData);

    console.log("Performance results have been written to file: " + filePath);
  } catch (error) {
    console.error('Error writing to file:', error);
  }
}
