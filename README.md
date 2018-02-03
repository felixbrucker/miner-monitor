# miner-monitor

Miner, balance, wallet and pool monitoring software

### Screen

![Stats](/screens/stats.png?raw=true "Stats")


### Prerequisites

miner-monitor requires nodejs >= 7.6.0, npm and optionally pm2 to run.

miners require the miner-manager to be installed

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

If you are on Windows just modify startTemplate.bat file to match your preferred compile and save as start.bat to not interfere with git updates

### Update software

run ``` git pull ```

### Todos

 - Write Tests


License
----

GNU GPLv3 (see LICENSE)
