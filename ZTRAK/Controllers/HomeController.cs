using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace ZTRAK.Controllers
{
    public class HomeController : Controller
    {

        // Data Context
        private ZtrakEntities db = new ZtrakEntities();

        public ActionResult Index()
        {

            #region Get User Info
            // Get the user ROLE since it's not available in the table - Needed in case any of these attrubutes
            // is updated

            if (ViewBag.UserName != User.Identity.Name)
            {
                // get User and set View Variables
                //
                try
                {
                    var user = (from u in db.AspNetUsers
                                where u.UserName != null && u.UserName == User.Identity.Name
                                select u).First();

                    ViewBag.UserName = user.UserName;
                    ViewBag.FirstName = user.FirstName;
                    ViewBag.LastName = user.LastName;
                    ViewBag.FullName = user.FirstName + " " + user.LastName;
                   
                    

                }
                catch (Exception)
                {

                    Debug.Write("Network down");


                }


            }
            #endregion

            return View();
        }

        public ActionResult About()
        {
            ViewBag.Message = "Your application description page.";

            return View();
        }

        public ActionResult Contact()
        {
            ViewBag.Message = "Your contact page.";

            return View();
        }
    }
}