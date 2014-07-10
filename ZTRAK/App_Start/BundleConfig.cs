using System.Web;
using System.Web.Optimization;

namespace ZTRAK
{
    public class BundleConfig
    {
        // For more information on bundling, visit http://go.microsoft.com/fwlink/?LinkId=301862
        public static void RegisterBundles(BundleCollection bundles)
        {
            bundles.Add(new ScriptBundle("~/bundles/jquery").Include(
                        "~/Scripts/jquery-{version}.js"));

            bundles.Add(new ScriptBundle("~/bundles/jqueryval").Include(
                        "~/Scripts/jquery.validate*"));

            // Use the development version of Modernizr to develop with and learn from. Then, when you're
            // ready for production, use the build tool at http://modernizr.com to pick only the tests you need.
            bundles.Add(new ScriptBundle("~/bundles/modernizr").Include(
                        "~/Scripts/modernizr-*"));

            bundles.Add(new ScriptBundle("~/bundles/bootstrap").Include(
                      "~/Scripts/bootstrap.js",
                      "~/Scripts/respond.js"));

            bundles.Add(new ScriptBundle("~/bundles/bstrap").Include(
                     "~/Scripts/bootstrap.js",
                     "~/Scripts/bootstrap-typeahead.js",
                     "~/Scripts/respond.js"
                     ));


            bundles.Add(new StyleBundle("~/Content/css").Include(
                      "~/Content/bootstrap.css",
                      "~/Content/font-awesome.css",
                      "~/Content/allfonts.css",
                      "~/Content/zfm.css",
                      "~/Content/typeahead.css",
                      "~/Content/site.css"));

            bundles.Add(new ScriptBundle("~/bundles/ko").Include(
                        "~/Scripts/knockout-{version}.js",
                        "~/Scripts/knockout.mapping-{version}.js",
                        "~/Scripts/moment.js",
                         "~/Scripts/bootbox.js",
                         "~/Scripts/filesize.js",
                           "~/Scripts/ion.sound.js",
                        "~/Scripts/jQueryRotate.js"
                         ));

            bundles.Add(new ScriptBundle("~/bundles/signalr").Include(
                      "~/Scripts/jquery.signalr-{version}.js"));

            bundles.Add(new ScriptBundle("~/bundles/zfm").Include(
                           "~/Scripts/zfm.js"));


            bundles.Add(new ScriptBundle("~/bundles/userm").Include(
                           "~/Scripts/UserManager.js"));


            // Set EnableOptimizations to false for debugging. For more information,
            // visit http://go.microsoft.com/fwlink/?LinkId=301862
            BundleTable.EnableOptimizations = true;
        }
    }
}
