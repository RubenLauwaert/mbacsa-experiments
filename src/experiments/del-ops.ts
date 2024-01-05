import { MbacsaClient } from "mbacsa-client";
import { AgentInfo, PerformanceResult, extractPathToPodServer, generatePerformanceResult } from "../util/util.js"
import * as fs from 'fs';
import path from 'path';


/**
 * Represents the configuration for delegation operations scalability experiments.
 */
export type ConfigDelegationOpsExperiment = {
  targetEndpoint:string,
  lengthDelegationChain:number,
  agents:AgentInfo[],
  iterations: number
}


/**
 * Represents a scalability report for MbacsaClient performance.
 */
export type MbacsaScalabilityReport = PerformanceResult[]

/**
 * Runs scalability experiments for delegation operations based on the provided configuration.
 * @param config The configuration for the scalability experiments.
 * @returns A promise that resolves to a MbacsaScalabilityReport.
 */
export async function runScalabilityExperiment(config:ConfigDelegationOpsExperiment):Promise<MbacsaScalabilityReport> {
  
  const {targetEndpoint, lengthDelegationChain, agents, iterations} = config;
  // Check provided configuration
  if(agents.length !== lengthDelegationChain){
    console.log("Provided configuration has an array of agents that does not match the provided length !");
    return;
  }
  
  const client = new MbacsaClient();

 
// Mint macaroon
  const {webId: minter, email: emailMinter, password: passwordMinter} = agents[0];
  const {dischargeKey: dKeyMinter} = await client.getPublicDischargeKey(minter);
  const podServerMinter = extractPathToPodServer(minter);
  const dpopTokenMinter = await client.retrieveDPoPToken(podServerMinter, emailMinter,passwordMinter);
  const mintResponse = await client.mintDelegationToken(minter,{
    dischargeKey: dKeyMinter,
    mode: 'read',
    requestor: minter,
    resourceURI: targetEndpoint
  },dpopTokenMinter)

  // Minter discharges macaroon
  const {dischargeMacaroon: dischargeMacaroonMinter} = await client.dischargeLastThirdPartyCaveat(mintResponse.mintedMacaroon,minter,dpopTokenMinter)

  // Construct delegation chain
  const [minterInfo,...delegatees] = agents
  let attenuatedMacaroons = [mintResponse.mintedMacaroon];
  for(let i = 0 ; i < lengthDelegationChain - 1; i++){
    const {webId:delegatee } = delegatees[i];
    const pdkDelegatee = await client.getPublicDischargeKey(delegatee)
    const attenuatedMacaroon = await client.delegateAccessTo(attenuatedMacaroons[i],delegatee,pdkDelegatee.dischargeKey);
    attenuatedMacaroons.push(attenuatedMacaroon)
  }

  // Generate discharge proofs for the delegatees
  const dischargeProofsDelegatees = await Promise.all(delegatees.map(async ({webId:delegatee, email:emailDelegatee, password: passwordDelegatee},chainIndex) => {
    const podServerDelegatee = extractPathToPodServer(delegatee)
    const dpopTokenDelegatee = await client.retrieveDPoPToken(podServerDelegatee,emailDelegatee,passwordDelegatee)
    const {dischargeMacaroon: dischargeProofDelegatee} = await client.dischargeLastThirdPartyCaveat(attenuatedMacaroons[chainIndex + 1],delegatee,dpopTokenDelegatee)
    return dischargeProofDelegatee;
  }))

  const dischargeProofs = [dischargeMacaroonMinter,...dischargeProofsDelegatees]


  // Scalability performance results
  let authorizationResults = [];

  // Run Authorization Scalability experiment "iterations" times
  for (let i = 0; i < iterations; i++) {
    for (let chainIndex = 0; chainIndex < lengthDelegationChain; chainIndex++) {
      // Pick right attenuated macaroon
      const attenuatedMacaroon = attenuatedMacaroons[chainIndex];
      
      // Get right chain of discharge proofs
      const correspondingDischargeProofs = dischargeProofs.slice(0, chainIndex + 1);
      
      // Make authorization request
      const startAuthorizingTime = process.hrtime();
      const postAlice = await client.accessWithDelegationToken(targetEndpoint, [attenuatedMacaroon, ...correspondingDischargeProofs]);
      const endAuthorizingTime = process.hrtime(startAuthorizingTime);
      const elapsedAuthorizingTime = endAuthorizingTime[0] * 1e6 + endAuthorizingTime[1] / 1e3;


      // Initialize the array for the chain if it doesn't exist yet
      if (!authorizationResults[chainIndex]) {
        authorizationResults[chainIndex] = [];
      }
      // Push the new elapsed time to the array
      authorizationResults[chainIndex].push(elapsedAuthorizingTime);
    }
  }

  // Run Revocation Scalability experiment "iterations" times

  let revocationResults = Array.from({length: lengthDelegationChain }, () => []);

  for(let i = 0 ; i < iterations;  i ++) {

    // Do revocations backwards, else first revocation revokes entire delegation chain
    for(let chainIndex = lengthDelegationChain - 1 ; chainIndex > -1; chainIndex--){

      
      // Get revoker and revokee
      if(chainIndex === 0){
        // Pick right attenuated macaroon
        const attenuatedMacaroon = attenuatedMacaroons[chainIndex];
        // Get corresponding discharge proofs
        const correspondingDischargeProofs = dischargeProofs.slice(0,chainIndex+1);
        const revoker = agents[chainIndex].webId;
        const revokee = agents[chainIndex].webId;
        // Make revocation request
        const startRevocationTime = process.hrtime();
        const revocationResponse = await client.revokeDelegationToken(revoker,revokee,[attenuatedMacaroon,...correspondingDischargeProofs])
        const endRevocationTime = process.hrtime(startRevocationTime);
        const elapsedRevocationTime = endRevocationTime[0] * 1e6 + endRevocationTime[1] / 1e3;
        revocationResults[chainIndex].push(elapsedRevocationTime)
      }else{
        // Pick right attenuated macaroon
        const attenuatedMacaroon = attenuatedMacaroons[chainIndex - 1];
        // Get corresponding discharge proofs
        const correspondingDischargeProofs = dischargeProofs.slice(0,chainIndex);
        const revoker = agents[chainIndex - 1].webId;
        const revokee = agents[chainIndex].webId;
        // Make revocation request
        const startRevocationTime = process.hrtime();
        const revocationResponse = await client.revokeDelegationToken(revoker,revokee,[attenuatedMacaroon,...correspondingDischargeProofs])
        const endRevocationTime = process.hrtime(startRevocationTime);
        const elapsedRevocationTime = endRevocationTime[0] * 1e6 + endRevocationTime[1] / 1e3;
        revocationResults[chainIndex].push(elapsedRevocationTime)
      }
      
  
    }
  }

  // Construct MbacsaScalabilityReport for authorization
  const authorizationReport = authorizationResults.map((responseTimes) => {
    return generatePerformanceResult(responseTimes);
  })

  // Write authorization report to file
  await writeScalabilityResultToFile(authorizationReport,"./results/authorization.json");

  // Construct MbacsaScalabilityReport for revocation
  const revocationReport = revocationResults.map((responseTimes) => {
    return generatePerformanceResult(responseTimes);
  })

   // Write revocation report to file
   await writeScalabilityResultToFile(revocationReport,"./results/revocation.json");

  return authorizationReport;

}


/**
 * Writes a scalability result to a file.
 * @param result The scalability result to write.
 * @param filePath The file path to write the result to.
 * @returns A promise that resolves when the result is written to the file.
 */
export async function writeScalabilityResultToFile(result: MbacsaScalabilityReport, filePath: string): Promise<void> {
  try {
    // Ensure that the directory exists
    const dirPath = path.dirname(filePath);
    fs.mkdirSync(dirPath, { recursive: true });

    // Convert the array to JSON string
    const jsonData = JSON.stringify(result, null, 2);

    // Write the JSON data to the file
    fs.writeFileSync(filePath, jsonData);

    console.log(`Performance results have been written to file: ${filePath}`);
  } catch (error) {
    console.error('Error writing to file:', error);
  }
}
