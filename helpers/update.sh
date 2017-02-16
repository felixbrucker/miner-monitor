#!/usr/bin/env bash

{

git pull
npm update

} &> data/update.log
