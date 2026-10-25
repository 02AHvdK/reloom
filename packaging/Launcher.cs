using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;
using System.Drawing;
class Launcher {
 static Process server;
 const string Url="http://127.0.0.1:4318/";
 static bool Healthy() {try {using(var c=new WebClient()){return c.DownloadString(Url+"api/health").Contains("0.20.0");}}catch{return false;}}
 static void Stop(){if(server!=null){try{if(!server.HasExited){server.Kill();server.WaitForExit(3000);}}catch{}server.Dispose();server=null;}}
 [STAThread] static int Main(string[] args){
  bool smoke=Array.IndexOf(args,"--smoke-test")>=0;
  try{
   string root=AppDomain.CurrentDomain.BaseDirectory;
   if(!Healthy()){
    var start=new ProcessStartInfo(Path.Combine(root,"runtime","node.exe"),"server/index.js --no-open");
    start.WorkingDirectory=Path.Combine(root,"web");start.UseShellExecute=false;start.CreateNoWindow=true;start.WindowStyle=ProcessWindowStyle.Hidden;start.EnvironmentVariables["PORT"]="4318";
    server=Process.Start(start);
    bool ready=false;for(int i=0;i<80;i++){if(server.HasExited)throw new Exception("服务未能启动，请检查 4318 端口是否被其他程序占用。");if(Healthy()){ready=true;break;}Thread.Sleep(150);}
    if(!ready)throw new Exception("本地服务启动超时。");
   }
   if(smoke){using(var c=new WebClient()){if(!c.DownloadString(Url).Contains("<title>RELOOM</title>"))throw new Exception("Web UI 版本不匹配。");}Stop();return 0;}
   Process.Start(new ProcessStartInfo(Url+"?v=0.20.0"){UseShellExecute=true});
   if(server==null)return 0;
   Application.EnableVisualStyles();
   using(var tray=new NotifyIcon()){
    tray.Icon=SystemIcons.Application;tray.Text="RELOOM 0.20.0";tray.Visible=true;
    var menu=new ContextMenuStrip();menu.Items.Add("打开 RELOOM",null,(s,e)=>Process.Start(new ProcessStartInfo(Url){UseShellExecute=true}));menu.Items.Add("退出并停止本地服务",null,(s,e)=>Application.Exit());tray.ContextMenuStrip=menu;
    tray.DoubleClick+=(s,e)=>Process.Start(new ProcessStartInfo(Url){UseShellExecute=true});Application.Run();tray.Visible=false;
   }
   return 0;
  }catch(Exception e){if(!smoke)MessageBox.Show(e.Message,"RELOOM 0.20.0",MessageBoxButtons.OK,MessageBoxIcon.Error);return 1;}finally{Stop();}
 }
}

