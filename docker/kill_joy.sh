#!/bin/sh
  echo "杀掉jd_crazy_joy_coin任务，并重启"
p_name=jd_crazy_joy_coin

while true
do
        pid="$(ps -ef|grep $p_name|grep -v grep|awk '{print $2}'|head -n1)"
        echo $pid
        if [ $pid ];then
                kill -9 $pid
                echo "kill success " $pid $p_name
                continue
        else
                echo "进程已杀完"
                break;
        fi
done

  echo "配置jd_crazy_joy_coin重启完成"
