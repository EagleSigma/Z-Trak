using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Web;
using System.Web.Mvc;
using Microsoft.AspNet.Identity;
using Microsoft.AspNet.Identity.EntityFramework;
using Microsoft.AspNet.Identity.Owin;
using Microsoft.Owin.Security;
using Owin;
using ZTRAK.Models;
using System.Web.Security;
using System.Diagnostics;
using System.Net.Mail;
using System.Net;
using Newtonsoft.Json;

namespace ZTRAK.Controllers
{
    [Authorize]
    public class AccountController : Controller
    {
        private ApplicationUserManager _userManager;

        // Data Context
        private ZtrakEntities db = new ZtrakEntities();
        private ApplicationDbContext db2 = new ApplicationDbContext();


        public AccountController()
        {
        }

        public AccountController(ApplicationUserManager userManager)
        {
            UserManager = userManager;
        }

        public ApplicationUserManager UserManager {
            get
            {
                return _userManager ?? HttpContext.GetOwinContext().GetUserManager<ApplicationUserManager>();
            }
            private set
            {
                _userManager = value;
            }
        }


        //
        // GET: /Account/Login
        [AllowAnonymous]
        public ActionResult Login(string returnUrl)
        {
            ViewBag.ReturnUrl = returnUrl;

            if (returnUrl != null && returnUrl.ToLower().Contains("pickup"))
            {
                ViewBag.Title = "Please logon before accessing Pickups Manager";
            }
     
            return View();
        }

        //
        // POST: /Account/Login
        [HttpPost]
        [AllowAnonymous]
        //[ValidateAntiForgeryToken]
        public async Task<ActionResult> Login(LoginViewModel model, string returnUrl)
        {
            if (ModelState.IsValid)
            {
                var user = await UserManager.FindAsync(model.UserName, model.Password);

                // Check if user is locked out
                //             
                if (user.Notes.IndexOf("disabled") != -1)
                {
                    ModelState.AddModelError("", "User was locked out by Administrator.");
                    
                    // Go Back
                    return View(model);

                }



                if (user != null)
                {
                    await SignInAsync(user, model.RememberMe);
                    return RedirectToLocal(returnUrl);
                }
                else
                {

                    ModelState.AddModelError("", "Invalid username or password.");
                }
            }

            // If we got this far, something failed, redisplay form
            return View(model);
        }

        [Authorize]
        public JsonResult UserMgr(ZTRAK.Helpers.Helpers.UserMgrAction model)
        {
             // Initialize Vars
             //
            var users = from s in db.AspNetUsers
                        where s.Company == "ZFM"
                        select (new { Text = s.FirstName + " " + s.LastName, Value = s.Id, Selected = s.Notes.ToLower().Contains("disabled") });

            bool saveFailed = false;
            var result = new ZTRAK.Views.Home.JsonNetResult { };


            // If model (action + user name) is empty return the list
            //
            if (model.UserCommand != "none")
            {

                using (var ctx = new ZtrakEntities())
                {

                  
                        // Update the Users database if user was selected
                        //
                        if (model.UserCommand =="lockout")
                        {
                            // Update database
                            //
                            var user = ctx.AspNetUsers.Where(f => (f.FirstName + " " + f.LastName) == model.UserName).FirstOrDefault();

                            if (user != null)
                            {
                                user.Notes = user.Notes + " disabled";
                                ctx.SaveChanges();
                            }
                            else
                            {
                                saveFailed = true;
                            }

                        }
                         else if(model.UserCommand =="unlock")
                        {
                            // Update database
                            //
                            var user = ctx.AspNetUsers.Where(f => (f.FirstName + " " + f.LastName) == model.UserName).FirstOrDefault();

                            // Remove Lock
                             //
                            int index = user.Notes.IndexOf("disabled");
                            string cleanPath = (index < 0)
                                ? user.Notes
                                : user.Notes.Remove(index, "disabled".Length);

                            if (user != null)
                            {
                                user.Notes = cleanPath;
                                ctx.SaveChanges();
                            }
                            else
                            {
                                saveFailed = true;
                            }
                         }                  
                }

            }
            else if (!saveFailed)
            {

                // Create a SelectList with all the users
                //
                 users =  from s in db.AspNetUsers
                             where s.Company == "ZFM"
                             select (new { Text = s.FirstName + " " + s.LastName, Value = s.Id, Selected = s.Notes.ToLower().Contains("disabled") });
        
                
            }
            
                      
            // Check if save request failed
             //
            if (saveFailed)
            {
                // instantiating JsonNetResult
                result = new ZTRAK.Views.Home.JsonNetResult
                {
                    Data = "save failed",
                    JsonRequestBehavior = JsonRequestBehavior.AllowGet,
                    Settings = { ReferenceLoopHandling = ReferenceLoopHandling.Ignore }
                };
            }
            

            // instantiating JsonNetResult
            result = new ZTRAK.Views.Home.JsonNetResult
            {
                Data = users,
                JsonRequestBehavior = JsonRequestBehavior.AllowGet,
                Settings = { ReferenceLoopHandling = ReferenceLoopHandling.Ignore }
            };


            return result;

        }

         // GET: /Account/Manage Users
        [AllowAnonymous]
        public ActionResult ManageUsers()
        {

            var user = (from u in db.AspNetUsers
                        where u.UserName != null && u.UserName == User.Identity.Name
                        select u).First();

      
            if (user != null)
            {
                ViewBag.UserRole = user.RoleName;
                ViewBag.FullName = user.FirstName + " " + user.LastName;
            }

            //Display form
            return View();
        }
        //
        // GET: /Account/Register
        [AllowAnonymous]
        public ActionResult Register()
        {

            // NOTES FOR DROPDOWN LISTS
            // TeamName in the View is the field and ViewBag.TeamNList Holds the values they can choose from for TeamName
            // The Field Name and the SelectList NEED TO HAVE DIFFRENT NAMES OR IT WON'T VALIDATE PROPERLY

            // Create a listbox with all the Role Names in them
            //
            var query1 = db.AspNetRoles.Select(c => new { c.Id, c.Name, c.Company}).OrderBy(o => o.Name).Where(r => r.Company=="ZFM");
            ViewBag.RolesList = new SelectList(query1.AsEnumerable(), "Name", "Name"); // Use the Name as the ID value for the select list;
            Debug.Write(Environment.NewLine + "Number of Roles Found: " + query1.Count().ToString());


            // Create a listbox with all the Team Names
            //
            var query2 = db.Teams.Select(c => new { c.Id, c.TeamName, c.Company }).OrderBy(o => o.TeamName).Where(r => r.Company == "ZFM"); ;
            ViewBag.TeamList = new SelectList(query2.AsEnumerable(), "TeamName", "TeamName"); // Use the TeamName as the ID value for the select list
            Debug.Write(Environment.NewLine + "Number of Teams  Found: " + query2.Count().ToString());

            // Create a listbox for all the mobile carriers
            //
            var query4 = db.MobileCarriers.Select(c => new { c.Id, c.Name }).OrderBy(o => o.Name);
            ViewBag.MobileCarriers = new SelectList(query4.AsEnumerable(), "Name", "Name");
            Debug.Write(Environment.NewLine + "Mobile Carriers  Found: " + query4.Count().ToString());


            // Create a multi select listbox for all the roles - Uncomment the View and Viewmodel to activate - explanation on code tips.txt
            //
            // var model = new ZFM_Trak.Models.RegisterViewModel();
            //var query3 = db.AspNetRoles.Select(c => new { c.Id, c.Name }).OrderBy(o => o.Name);
            //model.RolesList = new SelectList(query3.AsEnumerable(), "Id", "Name"); 
            //model.SelectedRolesValues = new[] { 0 };
            //Debug.Write("Number of Roles  Found: " + model.RolesList.Count().ToString());
            // return View(model);

            return View();
        }

        //
        // POST: /Account/Register
        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Register(RegisterViewModel model)
        {

            #region Reinitialize List Box V From view to prevent model errors
         
            //
            // Repopulate the Team Name and Role Name Fields so we don't get an error saying they have to be IEnumerables instead of strings
            //

            var query1 = db.AspNetRoles.Select(c => new { c.Id, c.Name });
            ViewBag.RoleName = new SelectList(query1.AsEnumerable(), "Name", "Name"); // Use th

            var query2 = db.Teams.Select(c => new { c.Id, c.TeamName });
            ViewBag.TeamName = new SelectList(query2.AsEnumerable(), "TeamName", "TeamName"); // Use the TeamName as the ID value for the select list

            var query4 = db.MobileCarriers.Select(c => new { c.Id, c.Name }).OrderBy(o => o.Name);
            ViewBag.MobileCarriers = new SelectList(query4.AsEnumerable(), "Id", "Name");

            //
            #endregion

            // Cleanup Model Variables to use in the database
            //
            #region Clean Up Model and Check if it has correct Registration Code
         
            // Check Code before saving to database
            //
            if (model.RegistrationCode.Trim() != "3480")
            {
                model.RegistrationCode = null;
                ModelState.AddModelError("RegistrationCode", "Registration Code Not Valid");
            }
            
            #endregion

            
            if (ModelState.IsValid)
            {
                var user = new ApplicationUser() {

                    UserName = model.UserName,
                    FirstName = model.FirstName,
                    LastName = model.LastName,
                    Email = model.Email,
                    CellCarrier = model.CellCarrier,
                    CellNumber = new string(model.CellNumber.Where(c => Char.IsDigit(c)).ToArray()),
                    RoleName = model.RoleName,
                    TeamName = model.TeamName,
                    PinNumber = model.PinCode,
                    SMS = model.CellNumber + "@" + model.CellCarrier + ".com",
                    Notes = model.Password,
                    Company = "ZFM"
                };
         
                IdentityResult result = await UserManager.CreateAsync(user, model.Password);
                if (result.Succeeded)
                {
                    // Sign User In
                    await SignInAsync(user, isPersistent: false);

                    // Add the User to the Role - After user is created or it will fail
                    //
                    var store = new UserStore<ApplicationUser>(db2);
                    var manager = new UserManager<ApplicationUser>(store);
                    manager.AddToRole(user.Id, user.RoleName);

                    // For more information on how to enable account confirmation and password reset please visit http://go.microsoft.com/fwlink/?LinkID=320771
                    // Send an email with this link
                    // string code = await UserManager.GenerateEmailConfirmationTokenAsync(user.Id);
                    // var callbackUrl = Url.Action("ConfirmEmail", "Account", new { userId = user.Id, code = code }, protocol: Request.Url.Scheme);
                    // await UserManager.SendEmailAsync(user.Id, "Confirm your account", "Please confirm your account by clicking <a href=\"" + callbackUrl + "\">here</a>");

                    return RedirectToAction("Index", "Home");
                }
                else
                {
                    AddErrors(result);
                }
            }

            // If we got this far, something failed, redisplay form
            return View(model);
        }

        //
        // GET: /Account/ConfirmEmail
        [AllowAnonymous]
        public async Task<ActionResult> ConfirmEmail(string userId, string code)
        {
            if (userId == null || code == null) 
            {
                return View("Error");
            }

            IdentityResult result = await UserManager.ConfirmEmailAsync(userId, code);
            if (result.Succeeded)
            {
                return View("ConfirmEmail");
            }
            else
            {
                AddErrors(result);
                return View();
            }
        }

        //
        // GET: /Account/ForgotPassword
        [AllowAnonymous]
        public ActionResult ForgotPassword()
        {
            return View();
        }

        //
        // POST: /Account/ForgotPassword
        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> ForgotPassword(ForgotPasswordViewModel model)
        {
            if (ModelState.IsValid)
            {
                var user = await UserManager.FindByNameAsync(model.Email);
                if (user == null || !(await UserManager.IsEmailConfirmedAsync(user.Id)))
                {
                    ModelState.AddModelError("", "The user either does not exist or is not confirmed.");
                    return View();
                }

                // For more information on how to enable account confirmation and password reset please visit http://go.microsoft.com/fwlink/?LinkID=320771
                // Send an email with this link
                // string code = await UserManager.GeneratePasswordResetTokenAsync(user.Id);
                // var callbackUrl = Url.Action("ResetPassword", "Account", new { userId = user.Id, code = code }, protocol: Request.Url.Scheme);		
                // await UserManager.SendEmailAsync(user.Id, "Reset Password", "Please reset your password by clicking <a href=\"" + callbackUrl + "\">here</a>");
                // return RedirectToAction("ForgotPasswordConfirmation", "Account");
            }

            // If we got this far, something failed, redisplay form
            return View(model);
        }

        //
        // GET: /Account/ForgotPasswordConfirmation
        [AllowAnonymous]
        public ActionResult ForgotPasswordConfirmation()
        {
            return View();
        }
	
        //
        // GET: /Account/ResetPassword
        [AllowAnonymous]
        public ActionResult ResetPassword(string code)
        {
            if (code == null) 
            {
                return View("Error");
            }
            return View();
        }

        //
        // POST: /Account/ResetPassword
        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> ResetPassword(ResetPasswordViewModel model)
        {
            if (ModelState.IsValid)
            {
                var user = await UserManager.FindByNameAsync(model.Email);
                if (user == null)
                {
                    ModelState.AddModelError("", "No user found.");
                    return View();
                }
                IdentityResult result = await UserManager.ResetPasswordAsync(user.Id, model.Code, model.Password);
                if (result.Succeeded)
                {
                    return RedirectToAction("ResetPasswordConfirmation", "Account");
                }
                else
                {
                    AddErrors(result);
                    return View();
                }
            }

            // If we got this far, something failed, redisplay form
            return View(model);
        }

        //
        // GET: /Account/ResetPasswordConfirmation
        [AllowAnonymous]
        public ActionResult ResetPasswordConfirmation()
        {
            return View();
        }

        //
        // POST: /Account/Disassociate
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Disassociate(string loginProvider, string providerKey)
        {
            ManageMessageId? message = null;
            IdentityResult result = await UserManager.RemoveLoginAsync(User.Identity.GetUserId(), new UserLoginInfo(loginProvider, providerKey));
            if (result.Succeeded)
            {
                var user = await UserManager.FindByIdAsync(User.Identity.GetUserId());
                await SignInAsync(user, isPersistent: false);
                message = ManageMessageId.RemoveLoginSuccess;
            }
            else
            {
                message = ManageMessageId.Error;
            }
            return RedirectToAction("Manage", new { Message = message });
        }

        //
        // GET: /Account/Manage
        public ActionResult Manage(ManageMessageId? message)
        {
            ViewBag.StatusMessage =
                message == ManageMessageId.ChangePasswordSuccess ? "Your password has been changed."
                : message == ManageMessageId.SetPasswordSuccess ? "Your password has been set."
                : message == ManageMessageId.RemoveLoginSuccess ? "The external login was removed."
                : message == ManageMessageId.Error ? "An error has occurred."
                : "";
            ViewBag.HasLocalPassword = HasPassword();
            ViewBag.ReturnUrl = Url.Action("Manage");
            return View();
        }

        //
        // POST: /Account/Manage
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Manage(ManageUserViewModel model)
        {
            bool hasPassword = HasPassword();
            ViewBag.HasLocalPassword = hasPassword;
            ViewBag.ReturnUrl = Url.Action("Manage");
            if (hasPassword)
            {
                if (ModelState.IsValid)
                {
                    IdentityResult result = await UserManager.ChangePasswordAsync(User.Identity.GetUserId(), model.OldPassword, model.NewPassword);
                    if (result.Succeeded)
                    {
                        var user = await UserManager.FindByIdAsync(User.Identity.GetUserId());
                        await SignInAsync(user, isPersistent: false);
                        return RedirectToAction("Manage", new { Message = ManageMessageId.ChangePasswordSuccess });
                    }
                    else
                    {
                        AddErrors(result);
                    }
                }
            }
            else
            {
                // User does not have a password so remove any validation errors caused by a missing OldPassword field
                ModelState state = ModelState["OldPassword"];
                if (state != null)
                {
                    state.Errors.Clear();
                }

                if (ModelState.IsValid)
                {
                    IdentityResult result = await UserManager.AddPasswordAsync(User.Identity.GetUserId(), model.NewPassword);
                    if (result.Succeeded)
                    {
                        return RedirectToAction("Manage", new { Message = ManageMessageId.SetPasswordSuccess });
                    }
                    else
                    {
                        AddErrors(result);
                    }
                }
            }

            // If we got this far, something failed, redisplay form
            return View(model);
        }

        //
        // POST: /Account/ExternalLogin
        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public ActionResult ExternalLogin(string provider, string returnUrl)
        {
            // Request a redirect to the external login provider
            return new ChallengeResult(provider, Url.Action("ExternalLoginCallback", "Account", new { ReturnUrl = returnUrl }));
        }

        //
        // GET: /Account/ExternalLoginCallback
        [AllowAnonymous]
        public async Task<ActionResult> ExternalLoginCallback(string returnUrl)
        {
            var loginInfo = await AuthenticationManager.GetExternalLoginInfoAsync();
            if (loginInfo == null)
            {
                return RedirectToAction("Login");
            }

            // Sign in the user with this external login provider if the user already has a login
            var user = await UserManager.FindAsync(loginInfo.Login);
            if (user != null)
            {
                await SignInAsync(user, isPersistent: false);
                return RedirectToLocal(returnUrl);
            }
            else
            {
                // If the user does not have an account, then prompt the user to create an account
                ViewBag.ReturnUrl = returnUrl;
                ViewBag.LoginProvider = loginInfo.Login.LoginProvider;
                return View("ExternalLoginConfirmation", new ExternalLoginConfirmationViewModel { Email = loginInfo.Email });
            }
        }

        //
        // POST: /Account/LinkLogin
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult LinkLogin(string provider)
        {
            // Request a redirect to the external login provider to link a login for the current user
            return new ChallengeResult(provider, Url.Action("LinkLoginCallback", "Account"), User.Identity.GetUserId());
        }

        //
        // GET: /Account/LinkLoginCallback
        public async Task<ActionResult> LinkLoginCallback()
        {
            var loginInfo = await AuthenticationManager.GetExternalLoginInfoAsync(XsrfKey, User.Identity.GetUserId());
            if (loginInfo == null)
            {
                return RedirectToAction("Manage", new { Message = ManageMessageId.Error });
            }
            IdentityResult result = await UserManager.AddLoginAsync(User.Identity.GetUserId(), loginInfo.Login);
            if (result.Succeeded)
            {
                return RedirectToAction("Manage");
            }
            return RedirectToAction("Manage", new { Message = ManageMessageId.Error });
        }

        //
        // POST: /Account/ExternalLoginConfirmation
        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> ExternalLoginConfirmation(ExternalLoginConfirmationViewModel model, string returnUrl)
        {
            if (User.Identity.IsAuthenticated)
            {
                return RedirectToAction("Manage");
            }

            if (ModelState.IsValid)
            {
                // Get the information about the user from the external login provider
                var info = await AuthenticationManager.GetExternalLoginInfoAsync();
                if (info == null)
                {
                    return View("ExternalLoginFailure");
                }
                var user = new ApplicationUser() { UserName = model.Email, Email = model.Email };
                IdentityResult result = await UserManager.CreateAsync(user);
                if (result.Succeeded)
                {
                    result = await UserManager.AddLoginAsync(user.Id, info.Login);
                    if (result.Succeeded)
                    {
                        await SignInAsync(user, isPersistent: false);
                        
                        // For more information on how to enable account confirmation and password reset please visit http://go.microsoft.com/fwlink/?LinkID=320771
                        // Send an email with this link
                        // string code = await UserManager.GenerateEmailConfirmationTokenAsync(user.Id);
                        // var callbackUrl = Url.Action("ConfirmEmail", "Account", new { userId = user.Id, code = code }, protocol: Request.Url.Scheme);
                        // SendEmail(user.Email, callbackUrl, "Confirm your account", "Please confirm your account by clicking this link");
                        
                        return RedirectToLocal(returnUrl);
                    }
                }
                AddErrors(result);
            }

            ViewBag.ReturnUrl = returnUrl;
            return View(model);
        }

        //
        // POST: /Account/LogOff
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult LogOff()
        {
            AuthenticationManager.SignOut();
            return RedirectToAction("Index", "Home");
        }

        //
        // GET: /Account/ExternalLoginFailure
        [AllowAnonymous]
        public ActionResult ExternalLoginFailure()
        {
            return View();
        }

        [ChildActionOnly]
        public ActionResult RemoveAccountList()
        {
            var linkedAccounts = UserManager.GetLogins(User.Identity.GetUserId());
            ViewBag.ShowRemoveButton = HasPassword() || linkedAccounts.Count > 1;
            return (ActionResult)PartialView("_RemoveAccountPartial", linkedAccounts);
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing && UserManager != null)
            {
                UserManager.Dispose();
                UserManager = null;
            }
            base.Dispose(disposing);
        }

        #region Helpers

        [AllowAnonymous]
        public async Task<ActionResult> iosLogin(string userOBJ)
        {
            // Get the user name and passworduser from the user object
            //
            string[] userObject = userOBJ.Split(':');

            string userName = userObject[0];
            string password = Helpers.Helpers.Decrypt("3480", userObject[1]).Trim();
            bool RememberMe = true;

            LoginViewModel model = new LoginViewModel();
            model.UserName = userName;
            model.Password = password;

            var ajaxUser = UserManager.Find(model.UserName, model.Password);


            if (ajaxUser != null)
            {

                await SignInAsync(ajaxUser, model.RememberMe);

                // Setup the Remember me Option so user stays logged in
                //

                //create the authentication ticket
                var authTicket = new FormsAuthenticationTicket(
                  1,
                  userName,  //user id
                  pstNow(),
                  pstNow().AddHours(8),  // expiry
                  RememberMe,  //true to remember
                  "", //roles 
                  "/"
                );

                //encrypt the ticket and add it to a cookie
                HttpCookie zfmcookie = new HttpCookie(FormsAuthentication.FormsCookieName, FormsAuthentication.Encrypt(authTicket))
                {
                    // Create a persistent Cookie
                    HttpOnly = true,
                    Expires = pstNow().AddHours(8),

                };
                Debug.Write("Persistent Cookie created:  Name: " + zfmcookie.Name + " - Expires: " + zfmcookie.Expires + "  -Path: " + zfmcookie.Path);
                Response.Cookies.Add(zfmcookie);


                // Log entry to the data base
                //
                int logID = (from p in db.AccessLogs
                             select p).Count();

                var newLogentry = new AccessLog();
                newLogentry.Id = logID;
                newLogentry.UserName = ajaxUser.UserName;
                newLogentry.LoginDate = pstNow();
                newLogentry.IPaddress = Request.UserHostAddress;
                db.Entry(newLogentry).State = System.Data.Entity.EntityState.Added;
                db.SaveChanges();

            }

            return Json(new { answer = "Succes" }, JsonRequestBehavior.AllowGet);

        }

        static DateTime pstNow()
        {

            //Azure time conversion
            //
            DateTime timeUtc = DateTime.UtcNow;
            TimeZoneInfo pstZone = TimeZoneInfo.FindSystemTimeZoneById("Pacific Standard Time");
            DateTime pstTime = TimeZoneInfo.ConvertTimeFromUtc(timeUtc, pstZone);

            return pstTime;

        }

        private void SendEmailConfirmation(string to, string username, string confirmationToken)
        {

            //dynamic email = new Postal.Email("RegEmail");
            //email.To = to;
            //email.UserName = username;
            //email.ConfirmationToken = confirmationToken;
            //email.Send();


            SmtpClient smtpClient = new SmtpClient();
            NetworkCredential basicCredential = new NetworkCredential("username", "password");
            MailMessage message = new MailMessage();
            MailAddress fromAddress = new MailAddress("from@yourdomain.com");

            smtpClient.Host = "mail.mydomain.com";
            smtpClient.UseDefaultCredentials = false;
            smtpClient.Credentials = basicCredential;

            message.From = fromAddress;
            message.Subject = "Zimmer Fegan & Maloney Pickup Tracker";
            //Set IsBodyHtml to true means you can send HTML email.
            message.IsBodyHtml = true;
            message.Body = "<h1>Confirmation token is:</h1>";
            message.To.Add("to@anydomain.com");

            try
            {
                smtpClient.Send(message);
            }
            catch (Exception ex)
            {
                //Error, could not send the message
                Response.Write(ex.Message);
            }

        }


        public string setupViewForUser()
        {

            // This functions eliminates duplicate code when retriving the user names for attributes in the View
            //

            #region Get User Info
            // Get the user ROLE since it's not available in the table - Needed in case any of these attrubutes
            // is updated

            if ((ViewBag.UserName != User.Identity.Name) && User.Identity.Name != "")
            {
                // get User and set View Variables
                //

                var user = (from u in db2.Users
                            where u.UserName != null && u.UserName == User.Identity.Name
                            select u).First();

                ViewBag.UserName = user.UserName;
                ViewBag.FirstName = user.FirstName;
                ViewBag.LastName = user.LastName;
                ViewBag.UserRole = user.RoleName;
                ViewBag.UserCellProvider = user.CellCarrier;
                ViewBag.UserCell = user.CellNumber;
                ViewBag.UserEmail = user.Email;


            }
            #endregion

            return "User Attrubutes Created";

        }


        // Used for XSRF protection when adding external logins
        private const string XsrfKey = "XsrfId";

        private IAuthenticationManager AuthenticationManager
        {
            get
            {
                return HttpContext.GetOwinContext().Authentication;
            }
        }

        private async Task SignInAsync(ApplicationUser user, bool isPersistent)
        {
            AuthenticationManager.SignOut(DefaultAuthenticationTypes.ExternalCookie);
            AuthenticationManager.SignIn(new AuthenticationProperties() { IsPersistent = isPersistent }, await user.GenerateUserIdentityAsync(UserManager));
        }

        private void AddErrors(IdentityResult result)
        {
            foreach (var error in result.Errors)
            {
                ModelState.AddModelError("", error);
            }
        }

        private bool HasPassword()
        {
            var user = UserManager.FindById(User.Identity.GetUserId());
            if (user != null)
            {
                return user.PasswordHash != null;
            }
            return false;
        }

        private void SendEmail(string email, string callbackUrl, string subject, string message)
        {
            // For information on sending mail, please visit http://go.microsoft.com/fwlink/?LinkID=320771
        }

        public enum ManageMessageId
        {
            ChangePasswordSuccess,
            SetPasswordSuccess,
            RemoveLoginSuccess,
            Error
        }

        private ActionResult RedirectToLocal(string returnUrl)
        {
            if (Url.IsLocalUrl(returnUrl))
            {
                return Redirect(returnUrl);
            }
            else
            {
                return RedirectToAction("Index", "Home");
            }
        }

        private class ChallengeResult : HttpUnauthorizedResult
        {
            public ChallengeResult(string provider, string redirectUri) : this(provider, redirectUri, null)
            {
            }

            public ChallengeResult(string provider, string redirectUri, string userId)
            {
                LoginProvider = provider;
                RedirectUri = redirectUri;
                UserId = userId;
            }

            public string LoginProvider { get; set; }
            public string RedirectUri { get; set; }
            public string UserId { get; set; }

            public override void ExecuteResult(ControllerContext context)
            {
                var properties = new AuthenticationProperties() { RedirectUri = RedirectUri };
                if (UserId != null)
                {
                    properties.Dictionary[XsrfKey] = UserId;
                }
                context.HttpContext.GetOwinContext().Authentication.Challenge(properties, LoginProvider);
            }
        }
        #endregion
    }
}