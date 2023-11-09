# mbacsa-experiments
This a repository for my thesis containing various experiments for the MBACSA framework. The benchmark experiments test the performance of the minting, discharging, revoking and authorizing operations of the [MBACSA Middleware](https://github.com/RubenLauwaert/mbacsa-css) for the Community Solid Server (CSS). These performance expirements use the [MBACSA Client](https://github.com/RubenLauwaert/mbacsa-client) library to make requests to the corresponding CSSs.

## Setting up experiments
The first step for setting up the experiments is to setup the Community Solid Servers that host the pods 
of Alice, Bob and Jane, respectively. This can be done by executing the following commands in the folder of this project:

```chmod +x ./scripts/set-up.sh```

```./scripts/set-up.sh```



