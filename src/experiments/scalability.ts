import { MbacsaClient } from "mbacsa-client";
import { AgentInfo, PerformanceResult, extractPathToPodServer, generatePerformanceResult } from "../util/util.js"


export type ConfigScalabilityExperiment = {
  targetEndpoint:string,
  lengthDelegationChain:number,
  agents:AgentInfo[],
  iterations: number
}

export type MbacsaScalabilityReport = PerformanceResult[]


export async function runScalabilityExperiment(config:ConfigScalabilityExperiment):Promise<MbacsaScalabilityReport> {
  
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
     const attenuatedMacaroon = await client.delegateAccessTo(attenuatedMacaroons[i],delegatee);
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
let results = [];

// Run Scalability experiment "iterations" times
for (let i = 0; i < iterations; i++) {
  for (let chainIndex = 0; chainIndex < lengthDelegationChain; chainIndex++) {
    // Pick right attenuated macaroon
    const attenuatedMacaroon = attenuatedMacaroons[chainIndex];
    
    // Get right chain of discharge proofs
    const correspondingDischargeProofs = dischargeProofs.slice(0, chainIndex + 1);
    
    // Make request
    const startAuthorizingTime = process.hrtime();
    const postAlice = await client.accessWithDelegationToken(targetEndpoint, [attenuatedMacaroon, ...correspondingDischargeProofs]);
    const endAuthorizingTime = process.hrtime(startAuthorizingTime);
    const elapsedAuthorizingTime = endAuthorizingTime[0] * 1e6 + endAuthorizingTime[1] / 1e3;

    // Initialize the array for the chain if it doesn't exist yet
    if (!results[chainIndex]) {
      results[chainIndex] = [];
    }
    // Push the new elapsed time to the array
    results[chainIndex].push(elapsedAuthorizingTime);
  }
}

// Construct MbacsaScalabilityReport
const report = results.map((responseTimes) => {
  return generatePerformanceResult(responseTimes);
})

return report;

}