
import { MbacsaClient } from 'mbacsa-client-2'



const client = new MbacsaClient();

// Generate DPOP tokens
const dpopAlice = await client.retrieveDPoPToken("http://localhost:3000/","Alice@example.com","Alice");
const dpopJane = await client.retrieveDPoPToken("http://localhost:3000/","Jane@example.com","Jane");


// Jane accesses Bob's resource via MBACSA 
for(let i=0; i < 2 ; i++){
  // Get Discharge Key
const dischargeKeyAlice = await client.getPublicDischargeKey("http://localhost:3000/Alice/profile/card#me");
// Minting a macaroon
const { mintedMacaroon : serializedMacaroonAlice} = await client.mintDelegationToken("http://localhost:3000/Alice/profile/card#me",
  { dischargeKey: dischargeKeyAlice.dischargeKey,
    mode: 'read',
    requestor: "http://localhost:3000/Alice/profile/card#me",
    resourceURI: "http://localhost:3000/Bob/social/post1.txt"},dpopAlice)
// Alice delegates access to Jane
const serializedMacaroonJane = await client.delegateAccessTo(serializedMacaroonAlice,"http://localhost:3000/Jane/profile/card#me");

// Alice gets a discharge proof 
const {dischargeMacaroon: dischargeProofAlice} = await client.dischargeDelegationToken("http://localhost:3000/Alice/profile/card#me",
  {
    agentToDischarge: "http://localhost:3000/Alice/profile/card#me",
    serializedRootMacaroon: serializedMacaroonAlice,
  }, dpopAlice)

console.log(MbacsaClient.inspectSerializedMacaroon(dischargeProofAlice))

// Jane gets a discharge proof
const {dischargeMacaroon: dischargeProofJane} = await client.dischargeDelegationToken("http://localhost:3000/Jane/profile/card#me",
  {
    agentToDischarge: "http://localhost:3000/Jane/profile/card#me",
    serializedRootMacaroon: serializedMacaroonJane,
  }, dpopJane)

  console.log(MbacsaClient.inspectSerializedMacaroon(dischargeProofJane))


// console.log(post)

// Jane accesses bob's post
const postBob = await client.getResource("http://localhost:3000/Bob/social/post1.txt",
[serializedMacaroonJane,dischargeProofAlice,dischargeProofJane])
console.log(postBob);
}

