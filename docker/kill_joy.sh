#!/bin/sh
  echo "杀掉jd_crazy_joy_coin任务，并重启"
while true
do
  pid="$(ps -ef|grep "jd_crazy_joy_coin" | awk '{print $2}'|head -n1)"
  echo $pid
  if[ ! -n $pid ];then
   kill -9 $pid
   echo "kill success " $pid
   continue
  else
   break
  fi
done
  echo "配置jd_crazy_joy_coin重启完成"