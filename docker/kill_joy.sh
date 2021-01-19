#!/bin/sh
  echo "杀掉jd_crazy_joy_coin任务，并重启"
  eval $(ps -ef | grep "jd_crazy_joy_coin" | awk '{print "kill "$1}')
  echo "配置jd_crazy_joy_coin重启完成"