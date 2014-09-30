// part of bd 
// -mh flurk.org

using System;
using System.IO;
using System.IO.Compression;

namespace ConsoleApplication
{
  class Program
  {
    static void Main(string[] args)
    {
      string zipPath = @"c:\blah.zip";
      string extractPath = Path.GetTempPath(); // path which we have write permissions to

      // first we will extract the JS file
      using (ZipArchive archive = ZipFile.Open(zipPath, ZipArchiveMode.update))
      {
        foreach(ZipArchiveEntry entry in archive.entries)
        {
          if(entry.Fullname.EndsWith("*.jsp", StringComparison.OrdinalIgnoreCase)
          {
            entry.ExtractToFile(Path.Combine(extractPath, entry.FullName)); // or random name
            // do we remove the file?
            // entry.Delete();

            // now we inject our data into the file
            using (StreamWriter sw = File.AppendText(Path.Combine(extractPath, entry.FullName)))
            {
              sw.WriteLine("xxx - placeholder - xxx");
            }

            // now we update the file in the original zip
            archive.CreateEntryFromFile(Path.Combine(extractPath, entry.FullName), entry.FullName);
          }
        }
      }
    }
  }
}
