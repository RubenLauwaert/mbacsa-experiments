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

await writeCorePerformanceResultsToFile(mainConfig,'./results/core-ops.json')


const scalabilityConfig:ConfigScalabilityExperiment = {
  iterations: 100,
  lengthDelegationChain: 20,
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
    { webId: "http://localhost:3000/Liam/profile/card#me", email: "Liam@example.com", password: "Liam" },
    { webId: "http://localhost:3000/Mia/profile/card#me", email: "Mia@example.com", password: "Mia" },
    { webId: "http://localhost:3000/Nathan/profile/card#me", email: "Nathan@example.com", password: "Nathan" },
    { webId: "http://localhost:3000/Olivia/profile/card#me", email: "Olivia@example.com", password: "Olivia" },
    { webId: "http://localhost:3000/Peter/profile/card#me", email: "Peter@example.com", password: "Peter" },
    { webId: "http://localhost:3000/Quinn/profile/card#me", email: "Quinn@example.com", password: "Quinn" },
    { webId: "http://localhost:3000/Rachel/profile/card#me", email: "Rachel@example.com", password: "Rachel" },
    { webId: "http://localhost:3000/Sam/profile/card#me", email: "Sam@example.com", password: "Sam" },
    { webId: "http://localhost:3000/Taylor/profile/card#me", email: "Taylor@example.com", password: "Taylor" },
    { webId: "http://localhost:3000/Uriel/profile/card#me", email: "Uriel@example.com", password: "Uriel" },
    { webId: "http://localhost:3000/Violet/profile/card#me", email: "Violet@example.com", password: "Violet" }

]
}

await runScalabilityExperiment(scalabilityConfig)

