# miner-monitor

miner monitoring software

### Screens

![Stats](/screens/stats.png?raw=true "Stats")


### Prerequisites

miner-monitor requires nodejs >= 7.6.0, npm and optionally pm2 to run.

for now you will need to remove the auth/session authorization in /var/www/f_status.php on all baikal miners you want to add.

miners require the agent to be installed (agent currently referrers to the miner-manager)

### Installation

```sh
git clone https://github.com/felixbrucker/miner-monitor
cd miner-monitor
npm install
npm install pm2 -g
```

### Run

```sh
pm2 start process.json
```

or

```sh
npm start
```

to startup on boot:

```sh
pm2 save
pm2 startup
```

or just modify startTemplate.bat file to match your preferred compile and save as start.bat to not interfere with git updates

### Update software

run ``` git pull ```

### Todos

 - Properly send responses to indicate the result to frontend
 - Write Tests


License
----

GNU GPLv3 (see LICENSE)
