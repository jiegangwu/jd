#!/bin/sh
  echo "杀掉jd_crazy_joy_coin任务，并重启"
  pid="$(ps -ef|grep "jd_crazy_joy_coin" | awk '{print $2}'|head -n1)"
  echo $pid
  kill -9 $pid
  echo "配置jd_crazy_joy_coin重启完成"