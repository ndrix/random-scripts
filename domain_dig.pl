#!/usr/bin/perl
# Domain Dig.  Or digdiggo :)
# script to dig out domains from a TLD
# http://michaelhendrickx.com/tools
# we use duckduckgo's website to get these results

# note: this 

$| = 1;

use strict;
use LWP::UserAgent;
use Getopt::Std;
use JSON;

# global vars
my $tld; # requested tld
my $ua, my $sleepdelay = 1;

my @user_agents = (
  "Mozilla/5.0 (Windows NT 6.1; rv:2.0) Gecko/20110319 Firefox/4.0",
  "DomainDig (check michaelhendrickx.com)"
);

sub fetch
{
  my ($tld, $offset) = ($_[0], $_[1]);
  $tld =~ s/^\.//g;
  my $url = "https://duckduckgo.com/d.js?q=site%3A".$tld."&l=us-en&p=1&s=".$offset;
  my $req = HTTP::Request->new(GET => $url);
  my $resp = $ua->request($req);
  my $return = $resp->content;
  $return =~ /^if \(nrn\) nrn\('d',(.*)\);$/g;
  my $return_json = "{ \"results\": ".$1."}"; 
  my $j = JSON::XS->new->utf8->decode($return_json);
  # we usually have 30 results
  for(my $i = 0; $i < 30; $i++){
    my $domain = $j->{"results"}[$i]->{"i"};
    if(length($domain) > 3){ print $domain."\n"; } # x.yy
  }
  # exit;
}


sub usage
{
    my $count = 0;
    print "usage: $0 [options] <tld>\n";
    print "options include: \n".
          "-u <int>: user agent, possible agents are:\n";
    foreach(@user_agents){ print "  ".++$count.": ".$_."\n"; }
    print "-d <int>: delay (in seconds) between requests\n";
    print "-h      : help (this)\n";
    print "\n";
    print "Example: $0 sa - this will get you all domains.";
    print "\n";
    exit;
}

# initialize all
sub init
{
  my %opt;
  $ua = LWP::UserAgent->new;
  getopts( "hu:", \%opt ) or usage();
  usage() if($#ARGV == -1);
  usage() if($opt{h});
  $tld = $ARGV[0];
  $ua->agent($user_agents[int($opt{u})]);
  if($opt{d}){ $sleepdelay = int($opt{d}); }
}


init();

# print " + scanning ".$tld."\n";
my $i = 0;
do
{
  fetch($tld, $i);
  sleep $sleepdelay;
}
while($i += 30);

