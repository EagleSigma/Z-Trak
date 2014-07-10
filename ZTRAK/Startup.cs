using Microsoft.Owin;
using Owin;

[assembly: OwinStartupAttribute(typeof(ZTRAK.Startup))]
namespace ZTRAK
{
    public partial class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            ConfigureAuth(app);
            app.MapSignalR();
        }
    }
}
