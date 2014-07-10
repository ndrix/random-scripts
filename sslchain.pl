#!/usr/bin/perl
use strict;
use Net::SSLeay qw(get_https3);
use Data::Dumper;

# verify callback
sub verify {
    my ($ok, $subj_cert, $issuer_cert, $depth, $errorcode, $arg, $chain) = @_;
    return $ok;
}

if(!$ARGV[0]){ print "usage: $0 <domain>\n"; exit; }
my $target = $ARGV[0];

my ($page, $response, $headers, $cert) = get_https3($target, 443, '/');
if(defined($cert) && $cert != 0){
  print "Subject Name: ";
  print Net::SSLeay::X509_NAME_oneline(Net::SSLeay::X509_get_subject_name($cert));
  print "\n\n issuer name: ";
  my $issuer_name = (Net::SSLeay::X509_get_issuer_name($cert));
  print Net::SSLeay::X509_NAME_oneline($issuer_name);
  my $issuer_count = Net::SSLeay::X509_NAME_entry_count($issuer_name);
  print "\nIssuer:\n";
  for my $i (0..$issuer_count-1){
    my $entry = Net::SSLeay::X509_NAME_get_entry($issuer_name, $i);
    my $str = Net::SSLeay::X509_NAME_ENTRY_get_data($entry);
    print " ".Net::SSLeay::P_ASN1_STRING_get($str)."\n";
    print " ".Net::SSLeay::X509_NAME_ENTRY_get_object($entry)."\n";
    print "---------\n\n";
  }
  print "\n\n issuer and serial hash: ";
  print (Net::SSLeay::X509_issuer_and_serial_hash($cert));
  print "\n\n issuer name hash: ";
  print (Net::SSLeay::X509_issuer_name_hash($cert));

  print "\n\nssl all names: ";
  print Net::SSLeay::X509_get_subjectAltNames($cert);
  print "\n\nserial number: ";
  print Net::SSLeay::X509_get_serialNumber($cert);
  print "\n\nmd5 fingerprint: ";
  print Net::SSLeay::X509_get_fingerprint($cert, "md5");
  print "\n\n";
}
else {
  print "Could not get cert\n";
  print $response;
}
