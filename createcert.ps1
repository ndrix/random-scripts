<# 
    .Synopsis
    CreateCert

    .Description 
    Creates a selfsigned cert in CurrentUser store, and exports it into a file in local dir

    .Parameter Name 
    DNS name of cert

    .Parameter Password
    Password to protect PFX file

    .Notes
    Send questions to mihendri@microsoft.com
#>

param (
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][string]$Password,
    [int]$ExpiryMonths = 12,
    [int]$KeyLength = 2048
)

$cert = New-SelfSignedCertificate   -DnsName $Name `
                                    -CertStoreLocation "Cert:\CurrentUser\My" `
                                    -Subject ("CN=" + $Name) `
                                    -KeyExportPolicy Exportable `
                                    -Provider "Microsoft Enhanced RSA and AES Cryptographic Provider" `
                                    -NotAfter (Get-Date).AddMonths($ExpiryMonths) `
                                    -HashAlgorithm SHA256 `
                                    -KeyLength $KeyLength

$CertPassword = ConvertTo-SecureString $Password -AsPlainText -Force

Export-PfxCertificate   -Cert ("Cert:\CurrentUser\My\" + $cert.Thumbprint) `
                        -FilePath ($Name + ".pfx") `
                        -Password $CertPassword -Force | Write-Verbose

Export-Certificate  -Cert ("Cert:\CurrentUser\My\" + $cert.Thumbprint) `
                    -FilePath ($Name + ".cer") `
                    -Type CERT | Write-Verbose

write-output ("Generated " + $Name + "(.cer/.pfx)")
write-output ("Thumbprint: " + $cert.Thumbprint)
