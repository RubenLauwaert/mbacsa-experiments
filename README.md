# mbacsa-experiments
This a repository for my thesis containing various experiments for the MBACSA framework. The benchmark experiments test the performance of the minting, discharging, revoking and authorizing operations of the [MBACSA Middleware](https://github.com/RubenLauwaert/mbacsa-css) for the Community Solid Server (CSS). These performance expirements use the [MBACSA Client](https://github.com/RubenLauwaert/mbacsa-client) library to make requests to the corresponding CSSs.

## Running experiments

Before running the performance experiments, make sure that you have a running instance of the [MBACSA Middleware](https://github.com/RubenLauwaert/mbacsa-css) and have 
seeded the pods of 20 agents, as they will be needed in the experiments. Also make sure that it is running on `http://localhost:3000/. `For more details, check out the [README](https://github.com/RubenLauwaert/mbacsa-css), specifying how to run the CSS and seed the pods for the experiments. To run the performance experiments, execute the following commands in the project folder:

`npm install`

After installing the dependencies, you can run the experiments with:

`npm run build && npm run start`





