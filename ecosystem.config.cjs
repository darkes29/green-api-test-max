const nvmNode = "/home/user1/.nvm/versions/node/v26.10.0/bin/node";
const interpreter = require("node:fs").existsSync(nvmNode) ? nvmNode : process.execPath;

module.exports = {
  apps: [
    {
      name: "green-api-testing",
      script: "node_modules/next/dist/bin/next",
      args: "start -H 0.0.0.0 -p 3000",
      interpreter,
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
