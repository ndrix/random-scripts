#!/bin/bash
IC=/sbin/ifconfig 
if [ -z $1 ]; then
  echo "Usage: $0 <interface>"
  echo "eg: $0 wlan0"
  exit
fi
if [ ! -e /sys/class/net/$1 ]; then
  echo "Error: $1 doesnt exist"
  exit
fi
VAR=`/usr/bin/hexdump -v -n 1 -e '"%02x"' /dev/urandom`
for i in 1 2 3 4 5
do
  VAR=$VAR:`/usr/bin/hexdump -v -n 1 -e '"%02x"' /dev/urandom`
done
echo "Setting $1 to $VAR"
sudo $IC $1 down
sudo $IC $1 hw ether $VAR
sudo $IC $1 up
