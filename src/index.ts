import { MainConfigurationInfo, runMainPerformanceExperiments as runMainPerformanceExperiment, writeCorePerformanceResultsToFile } from "./experiments/main.js";
import { ConfigScalabilityExperiment, runScalabilityExperiment, writeScalabilityResultToFile } from "./experiments/scalability.js";




const mainConfig:MainConfigurationInfo = {
  targetEndpoint: "Alice/social/post1.json",
  agent1Info: { webId: "http://localhost:3000/Alice/profile/card#me",
                email: "Alice@example.com",
                password: "Alice"},
  agent2Info: { webId: "http://localhost:3000/Bob/profile/card#me",
                email: "Bob@example.com",
                password: "Bob"},
  agent3Info: { webId: "http://localhost:3000/Charlie/profile/card#me",
            email: "Charlie@example.com",
            password: "Charlie"},
  iterations: 1
}

//const mainResults = await runMainPerformanceExperiment(mainConfig);
await writeCorePerformanceResultsToFile(mainConfig,'./results/core-ops.json')


const scalabilityConfig:ConfigScalabilityExperiment = {
  iterations: 100,
  lengthDelegationChain: 10,
  targetEndpoint: "http://localhost:3000/Alice/social/post1.json",
  agents: [
    { webId: "http://localhost:3000/Bob/profile/card#me", email: "Bob@example.com", password: "Bob" },
    { webId: "http://localhost:3000/Charlie/profile/card#me", email: "Charlie@example.com", password: "Charlie" },
    { webId: "http://localhost:3000/Dave/profile/card#me", email: "Dave@example.com", password: "Dave" },
    { webId: "http://localhost:3000/Eve/profile/card#me", email: "Eve@example.com", password: "Eve" },
    { webId: "http://localhost:3000/Frank/profile/card#me", email: "Frank@example.com", password: "Frank" },
    { webId: "http://localhost:3000/Grace/profile/card#me", email: "Grace@example.com", password: "Grace" },
    { webId: "http://localhost:3000/Hank/profile/card#me", email: "Hank@example.com", password: "Hank" },
    { webId: "http://localhost:3000/John/profile/card#me", email: "John@example.com", password: "John" },
    { webId: "http://localhost:3000/Kate/profile/card#me", email: "Kate@example.com", password: "Kate" },
    { webId: "http://localhost:3000/Liam/profile/card#me", email: "Liam@example.com", password: "Liam" }]
}

await runScalabilityExperiment(scalabilityConfig)

