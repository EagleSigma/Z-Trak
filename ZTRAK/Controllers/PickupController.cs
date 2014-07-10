using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using System.Net;
using System.Web;
using System.Web.Mvc;
using ZTRAK;
using ZTRAK.Models;
using System.Diagnostics;
using Newtonsoft.Json;
using System.IO;
using Microsoft.AspNet.Identity;
using Microsoft.AspNet.Identity.EntityFramework;
using System.Drawing;
using System.Drawing.Imaging;
using Twilio;


namespace ZTRAK.Views.Home
{

    public class JsonNetResult : JsonResult
    {
        public JsonNetResult()
        {
            Settings = new JsonSerializerSettings
            {
                ReferenceLoopHandling = ReferenceLoopHandling.Error
            };
        }

        public JsonSerializerSettings Settings { get; private set; }

        public override void ExecuteResult(ControllerContext context)
        {
            if (context == null)
                throw new ArgumentNullException("context");
            if (this.JsonRequestBehavior == JsonRequestBehavior.DenyGet && string.Equals(context.HttpContext.Request.HttpMethod, "GET", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("JSON GET is not allowed");

            HttpResponseBase response = context.HttpContext.Response;
            response.ContentType = string.IsNullOrEmpty(this.ContentType) ? "application/json" : this.ContentType;

            if (this.ContentEncoding != null)
                response.ContentEncoding = this.ContentEncoding;
            if (this.Data == null)
                return;

            var scriptSerializer = JsonSerializer.Create(this.Settings);

            using (var sw = new StringWriter())
            {
                scriptSerializer.Serialize(sw, this.Data);
                response.Write(sw.ToString());
            }
        }
    }

    public abstract class BaseController : Controller
    {
        protected override JsonResult Json(object data, string contentType,
            System.Text.Encoding contentEncoding, JsonRequestBehavior behavior)
        {
            return new JsonNetResult
            {
                Data = data,
                ContentType = contentType,
                ContentEncoding = contentEncoding,
                JsonRequestBehavior = behavior
            };
        }
    }

    public class PickupController : Controller
    {
        private ApplicationDbContext db = new ApplicationDbContext();
        private ZtrakEntities db2 = new ZtrakEntities();

        // RESET NUMBERS FOR ALL PICKUPS
        [Authorize]
        public JsonResult RenumberPickups(string result)
        {

            // Get all Pickups
            //
            var allPickups = (from p in db2.Pickups
                              where p.Created != null && !p.Status.Contains("Closed") && !p.Status.Contains("Cancelled")
                              orderby p.ID descending
                              select p);

            // Reset all IDs so they are sequencial
            //

            int pickupCounter = 1;

            foreach (var pickup in allPickups)
            {

                // First update the Pickup Order
                //
                pickup.ID = pickupCounter;

                // Then create a new items counter
                //
                int itemsCount = 1;

                // Then all the Items
                //
                foreach (var item in pickup.Items)
                {

                    // Start PickupID Link
                    //
                    item.PickupID = pickupCounter;

                    // Increment the item counter
                    //
                    itemsCount++;

                }

                // Increment the counter fpor the next Pickup
                //
                pickupCounter++;


            }

            db2.Entry(allPickups).State = EntityState.Modified;
            db2.SaveChanges();

            return Json(result, JsonRequestBehavior.AllowGet);
        }


        // GET: /Pickup/
        [Authorize]
        public ActionResult Index(string pID)
        {

            // Get User Info and place it in the View
            string CreateUserAttributes = setupViewForUser();

            // Check if there is a return pickup
            //
            if (!String.IsNullOrEmpty(pID))
            {
                ViewBag.ShowPickup = pID;
            }


            return View();

        }


        // GET: /Pickup/Details/5
        public async Task<ActionResult> Details(int? id)
        {
            if (id == null)
            {
                return new System.Web.Mvc.HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Pickup pickup = await db2.Pickups.FindAsync(id);
            if (pickup == null)
            {
                return HttpNotFound();
            }
            return View(pickup);
        }


        [Authorize]
        public ActionResult Location()
        {

            return View();

        }

        // GET: /Pickup/Create
        public ActionResult Create()
        {
            return View();
        }

        // POST: /Pickup/Create
        // To protect from overposting attacks, please enable the specific properties you want to bind to, for 
        // more details see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Create([Bind(Include = "ID,LocationID,LocationName,TransporterID,TransporterName,Rep,Manager,Account,ShipCode,Team,Contact,Phone,Fax,CreatedBy,Created,Closed,Status,ClosedBy,CancelledBy,Cancelled,LastModified,Notes,SortOrder,Temp")] Pickup pickup)
        {
            if (ModelState.IsValid)
            {
                db2.Pickups.Add(pickup);
                await db2.SaveChangesAsync();
                return RedirectToAction("Index");
            }

            return View(pickup);
        }


        // GET: /Pickup/Edit/5
        public async Task<ActionResult> Edit(int? id)
        {
            if (id == null)
            {
                return new System.Web.Mvc.HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Pickup pickup = await db2.Pickups.FindAsync(id);
            if (pickup == null)
            {
                return HttpNotFound();
            }
            return View(pickup);
        }

        // POST: /Pickup/Edit/5
        // To protect from overposting attacks, please enable the specific properties you want to bind to, for 
        // more details see http://go.microsoft.com/fwlink/?LinkId=317598.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> Edit([Bind(Include = "ID,LocationID,LocationName,TransporterID,TransporterName,Rep,Manager,Account,ShipCode,Team,Contact,Phone,Fax,CreatedBy,Created,Closed,Status,ClosedBy,CancelledBy,Cancelled,LastModified,Notes,SortOrder,Temp")] Pickup pickup)
        {
            if (ModelState.IsValid)
            {
                db2.Entry(pickup).State = EntityState.Modified;
                await db2.SaveChangesAsync();
                return RedirectToAction("Index");
            }
            return View(pickup);
        }

        // GET: /Pickup/Delete/5
        public async Task<ActionResult> Delete(int? id)
        {
            if (id == null)
            {
                return new System.Web.Mvc.HttpStatusCodeResult(HttpStatusCode.BadRequest);
            }
            Pickup pickup = await db2.Pickups.FindAsync(id);
            if (pickup == null)
            {
                return HttpNotFound();
            }
            return View(pickup);
        }

        // POST: /Pickup/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<ActionResult> DeleteConfirmed(int id)
        {
            Pickup pickup = await db2.Pickups.FindAsync(id);
            db2.Pickups.Remove(pickup);
            await db2.SaveChangesAsync();
            return RedirectToAction("Index");
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                db2.Dispose();
            }
            base.Dispose(disposing);
        }

        [Authorize]
        // [ValidateAntiForgeryToken]
        public JsonResult GetLocations(string requestType)
        {

            // Setup all the variables needed - user is extracted from the current logged in user
            //
            var user = (from u in db.Users
                        where u.UserName != null && u.UserName == User.Identity.Name
                        select u).First();

            string userTeam = user.TeamName.ToLower();
            string userRole = user.RoleName;
            string accessLevel = "Team"; // Default access
            var allLocations =
                                   ( from pickup in db2.Pickups
                                    join location in db2.Locations

                                    on pickup.LocationName equals
                                        location.Name
                                    where pickup.Created != null && !pickup.Status.ToLower().Contains("deleted") && !pickup.Status.ToLower().Contains("closed")
                                    && !pickup.Status.ToLower().Contains("completed")
                                    orderby pickup.Created descending
                                    select new
                                    {
                                        PickupID =
                                           pickup.ID,
                                        PickupNumber =
                                            pickup.PickupNumber,
                                        Status =
                                            pickup.Status,                                           
                                        Courier =
                                            pickup.TransporterName,
                                        WhContact = 
                                            pickup.Manager,
                                        Location =
                                            pickup.LocationName,
                                        Destination =
                                            pickup.Destination,
                                        SalesRep =
                                            pickup.Rep,
                                        Team = 
                                            pickup.Team,
                                        Notes = 
                                            pickup.Notes,
                                        Items = 
                                            pickup.Items,
                                        Latitude =
                                            location.Latitude,
                                        Longitude =
                                            location.Longitude
                                    }).Take(1);


            if (requestType == "start")
            {
                #region Determine the users role to choose one or all teams

                // Determine if user can see more than his Team
                //
                if (userRole == "Warehouse Admin" || userRole == "Courier Admin" || userRole == "Warehouse" || userRole == "Courier")
                {
                    // Show all the pickups
                    //
                    accessLevel = "All Teams";
                }

                #endregion

                #region Get the Pickups for the determined role

                switch (accessLevel)
                {

                    case "All Teams":

                        allLocations =
                                    from pickup in db2.Pickups
                                    join location in db2.Locations

                                    on pickup.LocationName equals
                                        location.Name
                                    where pickup.Created != null && !pickup.Status.ToLower().Contains("deleted") && !pickup.Status.ToLower().Contains("closed")
                                    && !pickup.Status.ToLower().Contains("completed") && pickup.Company == "ZFM"
                                    orderby pickup.Created descending
                                    select new
                                    {
                                        PickupID =
                                           pickup.ID,
                                        PickupNumber =
                                            pickup.PickupNumber,
                                        Status =
                                            pickup.Status,
                                        Courier =
                                            pickup.TransporterName,
                                        WhContact = 
                                            pickup.Manager,                                       
                                        Location =
                                            pickup.LocationName,
                                        Destination =
                                            pickup.Destination,
                                        SalesRep =
                                            pickup.Rep,
                                        Team = 
                                            pickup.Team,
                                        Notes = 
                                            pickup.Notes,
                                        Items = 
                                            pickup.Items,
                                        Latitude =
                                            location.Latitude,
                                        Longitude =
                                            location.Longitude
                                    };


                        break;


                    case "Team":
                        
                        allLocations =
                                    from pickup in db2.Pickups
                                    join location in db2.Locations

                                    on pickup.LocationName equals
                                        location.Name
                                    where pickup.Created != null && !pickup.Status.ToLower().Contains("deleted") && !pickup.Status.ToLower().Contains("closed")
                                    && !pickup.Status.ToLower().Contains("completed") && pickup.Team.ToLower() == userTeam && pickup.Company == "ZFM"
                                    orderby pickup.Created descending
                                    select new
                                    {
                                        PickupID =
                                           pickup.ID,
                                        PickupNumber =
                                            pickup.PickupNumber,
                                        Status =
                                            pickup.Status,
                                        Courier =
                                            pickup.TransporterName,
                                        WhContact =
                                            pickup.Manager,
                                        Location =
                                            pickup.LocationName,
                                        Destination =
                                            pickup.Destination,
                                        SalesRep =
                                            pickup.Rep,
                                        Team =
                                            pickup.Team,
                                        Notes =
                                            pickup.Notes,
                                        Items =
                                            pickup.Items,
                                        Latitude =
                                            location.Latitude,
                                        Longitude =
                                            location.Longitude
                                    };
                        break;

                }
                #endregion
            }
            else if (requestType == "end")
            {

                #region Determine the users role to choose one or all teams

                // Determine if user can see more than his Team
                //
                if (userRole == "Warehouse Admin" || userRole == "Courier Admin" || userRole == "Warehouse" || userRole == "Courier")
                {
                    // Show all the pickups
                    //
                    accessLevel = "All Teams";
                }

                #endregion

                #region Get the Locations for the determined role
     
                switch (accessLevel)
                {

                    case "All Teams":

                       allLocations =
                                    from pickup in db2.Pickups
                                    join location in db2.Locations

                                    on pickup.Destination equals
                                        location.Name
                                    where pickup.Created != null && !pickup.Status.ToLower().Contains("deleted") && !pickup.Status.ToLower().Contains("closed")
                                    && !pickup.Status.ToLower().Contains("completed") && pickup.Company == "ZFM"
                                    orderby pickup.Created descending
                                    select new
                                    {
                                        PickupID =
                                           pickup.ID,
                                        PickupNumber =
                                            pickup.PickupNumber,
                                        Status =
                                            pickup.Status,
                                        Courier =
                                            pickup.TransporterName,
                                        WhContact =
                                            pickup.Manager,
                                        Location =
                                            pickup.LocationName,
                                        Destination =
                                            pickup.Destination,
                                        SalesRep =
                                            pickup.Rep,
                                        Team =
                                            pickup.Team,
                                        Notes =
                                            pickup.Notes,
                                        Items =
                                            pickup.Items,
                                        Latitude =
                                            location.Latitude,
                                        Longitude =
                                            location.Longitude
                                    };

                        break;


                    case "Team":

                        allLocations =
                                    from pickup in db2.Pickups
                                    join location in db2.Locations

                                    on pickup.LocationName equals
                                        location.Name
                                    where pickup.Created != null && !pickup.Status.ToLower().Contains("deleted") && !pickup.Status.ToLower().Contains("closed")
                                    && !pickup.Status.ToLower().Contains("completed") && pickup.Team.ToLower() == userTeam && pickup.Company == "ZFM"
                                    orderby pickup.Created descending
                                    select new
                                    {
                                        PickupID =
                                           pickup.ID,
                                        PickupNumber =
                                            pickup.PickupNumber,
                                        Status =
                                            pickup.Status,
                                        Courier =
                                            pickup.TransporterName,
                                        WhContact =
                                            pickup.Manager,
                                        Location =
                                            pickup.LocationName,
                                        Destination =
                                            pickup.Destination,
                                        SalesRep =
                                            pickup.Rep,
                                        Team =
                                            pickup.Team,
                                        Notes =
                                            pickup.Notes,
                                        Items =
                                            pickup.Items,
                                        Latitude =
                                            location.Latitude,
                                        Longitude =
                                            location.Longitude
                                    };

                        break;

                }
                #endregion
                
            }
            
            #region Send the results back
            //
            // Log
            Debug.Write(Environment.NewLine + "JSON Request for all Pickups granted");
            Debug.Write(Environment.NewLine + "Number of Pickups sent: " + allLocations.Count().ToString());


            // instantiating JsonNetResult
            var result = new JsonNetResult
            {
                Data = allLocations.ToList(),
                JsonRequestBehavior = JsonRequestBehavior.AllowGet,
                Settings = { ReferenceLoopHandling = ReferenceLoopHandling.Ignore }
            };


            return result;
            //
            #endregion

        }

        [HttpPost]
        public JsonResult SaveLocation(string locInfo)
        {

            // Break apart the address
            //
            string[] loc;
            string status="";

            // Extract The fields
            loc = locInfo.Split(',');

            // Check if a duplicate exists
            //
            // Limit return to the first five matches
            string locName = loc[0];
            string locOverwrite = loc[7].Trim();
            var result = db2.Locations
                           .Where(r => r.Name.ToLower() == locName.ToLower() && r.Company == "ZFM")
                           .Select(r => new { label = r.Name }).Distinct();

            // Deyect duplicates
            //
            if (result.Count() >= 1)
            {
                // Duplicate Detected
                status = "duplicate";
            }
            
            if (locOverwrite == "yes" && result.Count() >= 1)
            {
                try
                {
                    // delete existing
                    //
                    using (var ctx = new ZtrakEntities())
                    {

                        var listToRemove = (from i in ctx.Locations
                                        where i.Name.ToLower() == locName.ToLower()  && i.Company == "ZFM"
                                        select i);


                        if (listToRemove.Count() >= 1)
                        {
                            ctx.Locations.RemoveRange(listToRemove);
                            ctx.SaveChanges();
                        }
                    }

                    //Save the Location
                    //
                    Location newLocation = new Location
                    {
                        Name = loc[0].ToLower(),
                        Address = loc[1],
                        City = loc[2],
                        State = loc[3],
                        Zip = loc[4],
                        Latitude = Convert.ToDouble(loc[5]),
                        Longitude = Convert.ToDouble(loc[6]),
                        Company = "ZFM"

                    };

                    // Save it 
                    db2.Locations.Add(newLocation);
                    db2.SaveChanges();
                    status = "saved!";

                }
                catch (Exception e)
                {
                    Console.WriteLine(e.Message);
                    // Provide for exceptions.
                }
            }
            
            if (locOverwrite == "no" && result.Count() == 0)
            {
                try
                {
                    //Save the Location
                    //
                    Location newLocation = new Location
                    {
                        Name = loc[0].ToLower(),
                        Address = loc[1],
                        City = loc[2],
                        State = loc[3],
                        Zip = loc[4],
                        Latitude = Convert.ToDouble(loc[5]),
                        Longitude = Convert.ToDouble(loc[6]),
                        Company = "ZFM"

                    };

                    // Save it 
                    db2.Locations.Add(newLocation);
                    db2.SaveChanges();
                    status = "saved!";

                }
                catch (Exception e)
                {
                    Console.WriteLine(e.Message);
                    // Provide for exceptions.
                }
            }
        
            //
            return Json(new { answer = status }, JsonRequestBehavior.AllowGet);

        }

        [Authorize]
        // [ValidateAntiForgeryToken]
        public JsonResult GetPickups(string requestType)
        {

            #region Setup the View for the user credentials
            //
            try
            {
                // Setup user for the View 
                string currUser = setupViewForUser();
            }
            catch (Exception e)
            {
                //Return the exception message as JSON
                return Json(new { error = e.Message });
            }
            #endregion

            // Setup all the variables needed - user is extracted from the current logged in user
            //
            var user = (from u in db.Users
                        where u.UserName != null && u.UserName == User.Identity.Name
                        select u).First();

            string userTeam = user.TeamName.ToLower();
            string userRole = user.RoleName;
            string accessLevel = "Team";
            var allPickups = (from p in db2.Pickups
                              where p.Created != null && !p.Status.ToLower().Contains("deleted") && p.Status.ToLower().Contains("completed")
                              select p).Take(1);


            if (requestType == "standard")
            {
                #region Determine the users role to choose one or all teams

                // Determine if user can see more than his Team
                //
                if (userRole == "Warehouse Admin" || userRole == "Courier Admin" || userRole == "Warehouse" || userRole == "Courier")
                {
                    // Show all the pickups
                    //
                    accessLevel = "All Teams";
                }

                #endregion

                #region Get the Pickups for the determined role

                switch (accessLevel)
                {

                    case "All Teams":

                        allPickups = (from p in db2.Pickups
                                      where p.Created != null && !p.Status.ToLower().Contains("deleted") && !p.Status.ToLower().Contains("completed") && !p.Status.ToLower().Contains("closed") && p.Company == "ZFM"
                                      orderby p.Created descending
                                      select p);
                        break;


                    case "Team":

                        allPickups = (from p in db2.Pickups
                                      where p.Created != null && !p.Status.ToLower().Contains("deleted") && !p.Status.ToLower().Contains("completed") && !p.Status.ToLower().Contains("closed") && p.Team.ToLower() == userTeam
                                      orderby p.Created descending
                                      select p);

                        break;

                }
                #endregion
            }
            else if (requestType == "completed")
            {

                #region Determine the users role to choose one or all teams

                // Determine if user can see more than his Team
                //
                if (userRole == "Warehouse Admin" || userRole == "Courier Admin" || userRole == "Warehouse" || userRole == "Courier")
                {
                    // Show all the pickups
                    //
                    accessLevel = "All Teams";
                }

                #endregion

                #region Update All Pickups  to use the the right template 
                //
                using (var ctx = new ZtrakEntities())
                {
                    var displayModeList = (from p in ctx.Pickups
                                           where p.Created != null && !p.Status.ToLower().Contains("deleted") && p.Status.ToLower().Contains("completed") || p.Status.ToLower().Contains("closed") && p.Company == "ZFM"
                                           select p);

                    if (displayModeList.Count() >= 1)
                    {
                        // Update Mode to 'done' template
                        //
                        foreach (var item in displayModeList)
                        {
                            item.Mode = "done";
                        }

                        ctx.SaveChanges();
                    }
                }
                        
                #endregion


                #region Return all the Completed Pickups
                //
                switch (accessLevel)
                {


                    case "All Teams":

                        allPickups = (from p in db2.Pickups
                                      where p.Created != null && !p.Status.ToLower().Contains("deleted") && p.Status.ToLower().Contains("completed") || p.Status.ToLower().Contains("closed") && p.Company == "ZFM"
                                      orderby p.Created descending
                                      select p);
                        break;


                    case "Team":

                        allPickups = (from p in db2.Pickups
                                      where p.Created != null && !p.Status.ToLower().Contains("deleted") && p.Status.ToLower().Contains("completed") || p.Status.ToLower().Contains("completed") && p.Team.ToLower() == userTeam && p.Company == "ZFM"
                                      orderby p.Created descending
                                      select p);

                        break;

                }
                #endregion


            }


            #region Send the results back
            //
            // Log
            Debug.Write(Environment.NewLine + "JSON Request for all Pickups granted");
            Debug.Write(Environment.NewLine + "Number of Pickups sent: " + allPickups.Count().ToString());


            // instantiating JsonNetResult
            var result = new JsonNetResult
            {
                Data = allPickups.ToList(),
                JsonRequestBehavior = JsonRequestBehavior.AllowGet,
                Settings = { ReferenceLoopHandling = ReferenceLoopHandling.Ignore }
            };


            return result;
            //
            #endregion

        }

        [HttpPost]
        public ActionResult UpdatePickup(Pickup pickup)
        {
            // get the current user 
            //
            string currentUserId = User.Identity.GetUserId();
            string fullName = null;
            try
            {
                
                // Get info for Current user
                //
                ApplicationUser currentUser = db.Users.FirstOrDefault(x => x.Id == currentUserId);
                
                // Get user's full name to notify others
                //
                fullName = currentUser.FirstName + " " + currentUser.LastName;


            }
            catch (Exception ex)
            {

                Debug.Write("Error autheticating user: " + ex.Message);
            }
           
            if (ModelState.IsValid)
            {

                #region Update Exisiting Pickup
                // The Items in The Pickup Will need to be updated separetely
                // But First they need to be removed and then added as needed
                //

                #region Delete all items or photos first
                //
                using (var ctx = new ZtrakEntities())
                {

                    var listToRemove = (from i in ctx.Items
                                        where i.PickupID == pickup.ID
                                        select i);

                    if (listToRemove.Count() >= 1)
                    {
                        ctx.Items.RemoveRange(listToRemove);
                        ctx.SaveChanges();
                    }
                }

                // Add all the Items Received
                //
                foreach (var newItem in pickup.Items)
                {
                    // Add Items with Descriptions and not empty ones
                    //
                    if (newItem.Qty != 0)
                    {
                        // Save Item
                        //
                        // Check if it has a picture and if not mark it
                        if (String.IsNullOrEmpty(newItem.Picture1))
                            newItem.Picture1 = "none";

                        // Update Comnpany Data
                        //
                        newItem.Company = "ZFM";

                        db2.Items.Add(newItem);
                    }
                }

                try
                {
                    db2.SaveChanges();
                }
                catch (Exception e)
                {
                    Console.WriteLine(e);
                    // Provide for exceptions.
                }

                #endregion

                pickup.LastEditBy = fullName;
                
                //Azure time conversion
                //
                DateTime timeUtc = DateTime.UtcNow;
                TimeZoneInfo pstZone = TimeZoneInfo.FindSystemTimeZoneById("Pacific Standard Time");
                DateTime pstTime = TimeZoneInfo.ConvertTimeFromUtc(timeUtc, pstZone);

                pickup.LastModified = pstTime;


                //BMK Pickup Completed
                //
                if (pickup.Status.ToLower().Contains("completed") || pickup.Status.ToLower().Contains("closed"))
                {
                    pickup.Closed = pstNow();
                    pickup.ClosedBy = fullName;


                    // then delete all the pictures if any
                    foreach (var item in pickup.Items)
                    {
                        // Get file and erase
                        if (!String.IsNullOrEmpty(item.Picture1) && item.Picture1 != "none")
                        {
                            // Get file name
                            var file = Path.GetFileName(item.Picture1);
                            // Create Path

                            var path = Path.Combine(Server.MapPath("/Content/Photos/"), file);

                            // Erase File
                            FileInfo fi1 = new FileInfo(path);

                            if (fi1.Exists)     // check  if its there and delete
                                fi1.Delete();

                        }
                    }


                }

                //BMK Pickup Completed with SMS
                //
                if (pickup.Status.ToLower().Contains("completed sms") || pickup.Status.ToLower().Contains("closed sms"))
                {
                    
                    // Update the Status 
                    //
                    pickup.Closed = pstNow();
                    pickup.ClosedBy = fullName;

                    // Get the Sales Rep Number
                    //
                    ApplicationUser salesRep4PU = db.Users.FirstOrDefault(x => x.FirstName + " " + x.LastName == pickup.Rep);

                    // Get user's full name to notify others
                    //
                    string repSMS = salesRep4PU.CellNumber;


                    // Get the Courier Number
                    //
                    ApplicationUser courierSMS = db.Users.FirstOrDefault(x => x.FirstName + " " + x.LastName == pickup.TransporterName);

                    // Get user's full name to notify others
                    //
                    string trasportSMS = courierSMS.CellNumber;


                    // Cleanup
                    //
                    salesRep4PU = null;
                    courierSMS = null;

                    // Add the Prefix ( +1 ) if the numbers don't have them 
                    //
                    if(repSMS.Substring(0, 2) != "+1")
                        repSMS = "+1" + repSMS;

                    if (trasportSMS.Substring(0, 2) != "+1")
                        trasportSMS = "+1" + trasportSMS;
                    
                    // Send the SMS alert
                    //
                    
                    // Find your Account Sid and Auth Token at twilio.com/user/account
                    //
                    string AccountSid = "AC1ac0db79f475dc98b90b50a4f245217f";
                    string AuthToken = "b6c641704a0678be31dc089173aae90a";

                    var twilio = new TwilioRestClient(AccountSid, AuthToken);
                    //var message = twilio.SendMessage(repSMS, trasportSMS, "Pickup #: " + pickup.PickupNumber + " - Closed by: " + pickup.ClosedBy , " -> NOTES: " + pickup.Notes);
                    //var message = twilio.SendMessage( "+15107882884",  repSMS + "," + trasportSMS, "Hello World");

                    // Send Message to Sales Rep
                    //
                    var messageRep = twilio.SendMessage("+15107882884", repSMS, "Pickup #: " + pickup.PickupNumber + "\n\nClosed by: " + pickup.ClosedBy + "\n\n" + pickup.Notes);
                        

                     // Send Message to Courier
                     //
                    var messageCourier = twilio.SendMessage("+15107882884", trasportSMS, "Pickup #: " + pickup.PickupNumber + "\n\nClosed by: " + pickup.ClosedBy + "\n\n" + pickup.Notes);
                     

                     if (messageRep.RestException != null || messageCourier.RestException != null)
                    {

                        
                        // handle the error ...
                        //
                            Debug.Print(messageRep.RestException.Message);
                            Debug.Print(messageCourier.RestException.Message);
                    }



                    // then delete all the pictures if any
                    foreach (var item in pickup.Items)
                    {
                        // Get file and erase
                        if (!String.IsNullOrEmpty(item.Picture1) && item.Picture1 != "none")
                        {
                            // Get file name
                            var file = Path.GetFileName(item.Picture1);
                            // Create Path

                            var path = Path.Combine(Server.MapPath("/Content/Photos/"), file);

                            // Erase File
                            FileInfo fi1 = new FileInfo(path);

                            if (fi1.Exists)     // check  if its there and delete
                                fi1.Delete();

                        }
                    }


                }


                db2.Entry(pickup).State = EntityState.Modified;
                db2.SaveChanges();

                // Check if the Location Already Exists
                //
                var locationCheck = (from l in db2.Locations
                                     where l.Name.Contains(pickup.LocationName)
                                     select l);

                if (locationCheck.Count() == 0)
                {
                    // Add it to the Locations database
                    Location newLocatioEntry = new Location
                    {
                        Name = pickup.LocationName

                    };
                    db2.Locations.Add(newLocatioEntry);
                    db2.SaveChanges();
                }

                // Send Message To All Users To Update Pickup List
                //              
                string updatedPickup = pickup.PickupNumber.ToString();  // Get Pickup Number

                var hub = Microsoft.AspNet.SignalR.GlobalHost.ConnectionManager.GetHubContext<ZTRAK.Hubs.PickupHub>();
                hub.Clients.All.newDataUpdate(fullName, updatedPickup);

                return Json(pickup.ID);

                #endregion
            }
            else
            {
                #region Create a new Pickup

                // Determine if this is a new pickup
                //
                if (pickup.ID == 0)
                {

                    // Convert the pickup to a list so we can remove items if needed
                    //
                    foreach (var item in pickup.Items.ToList())
                    {
                        // Remove Items marked
                        if (item.Qty == 0)
                        {
                            pickup.Items.Remove(item);

                        }
                    }

                    // Update the Company Name for new pickup
                    //
                    pickup.Company = "ZFM";

                    // Save new pickup - fix ID and proceed to save
                    // Calculate the new PickupID and assign it to the new pickup in order to 
                    // avoid drastic number changes
                    var pUcount = (from r in db2.Pickups
                                 where r.ID != null
                                 select r).Count() + 1; // Increase by One for new Pickup

                    pickup.PickupNumber = pUcount;

                    // Get the Team name if the value was not given
                    //
                    if(String.IsNullOrEmpty(pickup.Team))
                    {
                        // Get the Team Name
                        string teamName = (from t in db2.AspNetUsers
                                        where (t.FirstName.ToLower().Trim() + " " + t.LastName.ToLower().Trim() == pickup.Rep.ToLower().Trim())
                                       select t.TeamName).FirstOrDefault(); // Try to Find the Team for the new Pickup

                        // Assign the Team if the Team is found
                        //
                        if(!String.IsNullOrEmpty(teamName))
                        pickup.Team = teamName.ToString();
                    }

                    //
                    db2.Entry(pickup).State = EntityState.Added;
                    db2.SaveChanges();

                    string NewPickup = pickup.PickupNumber.ToString();  // Get Pickup Number


                    // Let the others know
                    //
                    var hub = Microsoft.AspNet.SignalR.GlobalHost.ConnectionManager.GetHubContext<Hubs.PickupHub>();
                    hub.Clients.All.newDataUpdate(fullName, NewPickup);


                    return Json(NewPickup);

                }

                #endregion

            }
            return View();
        }

        public JsonResult Decode(string cypher)
        {

            //Return uncrypted data request
            //
            string result = Helpers.Helpers.Decrypt("3480", cypher);
            Debug.Write("\n" + "Decryption done: " + result);

            return Json(new { answer = result }, JsonRequestBehavior.AllowGet);

        }

        [HttpPost]
        public ActionResult Files(IEnumerable<HttpPostedFileBase> files, string PickupNumber)
        {


            #region Get User Info and prepare database update
            //
            var user = (from u in db.Users
                        where u.UserName != null && u.UserName == User.Identity.Name
                        select u).First();


            #endregion

            #region  Process Files
            //

            string[] ImageList = new string[files.Count()]; // keep trak of image names

            var fileList = files.ToList();

            for (int i = 0; i < fileList.Count(); i++)
            {

                #region Compress Each Photo

                // Create File List
                //
                var file = fileList[i];

                // skip empty ones              
                if (file == null || file.ContentLength == 0)
                {

                    // Enter a spacer to keep the item reference from beeing lost
                    //
                    ImageList[i] = "empty";

                    /// now move on
                    continue;
                }

                // Create the file name with the extention
                //
                var fileName = DateTime.Now.Millisecond.ToString() + randomName(4) + Path.GetExtension(file.FileName);
                System.Threading.Thread.Sleep(10);

                /// Create Path
                var path = Path.Combine(Server.MapPath("/Content/Photos/"), fileName);

                // Store the file name to uptade items database
                ImageList[i] = fileName;

                // Create Compressedn Image 
                //
                Bitmap img = new Bitmap(file.InputStream);
                imgcompression(img, path, fileName);


                #endregion

            }
            #endregion Files Processed

            #region  Log to database
            
            // Pickup to ID
            int pickup2Match = Convert.ToInt16(PickupNumber);
            int pickupID = (from p in db2.Pickups
                            where p.PickupNumber == pickup2Match
                            select p.ID).FirstOrDefault();

            // Erase current Items
            //
            using (var ctx = new ZtrakEntities())
            {

                var listToRemove = (from i in ctx.Items
                                    where i.PickupReff == pickup2Match
                                    select i);

                // Delete All Existing Graphics Pictures
                //
                foreach (var item in listToRemove)
                {

                    // Delete existing image first and then replace
                    //
                    if (!String.IsNullOrEmpty(item.Picture1))
                    {
                        // erase existing picture from disk
                        //
                        string file = Path.GetFileName(item.Picture1);

                        var path = Path.Combine(Server.MapPath("/Content/Photos/"), file);

                        // Erase File
                        FileInfo fi1 = new FileInfo(path);

                        if (fi1.Exists)     // check  if file exists and delete
                            fi1.Delete();

                    }
                }

                // Delete All Entries
                if (listToRemove.Count() >= 1)
                {
                    ctx.Items.RemoveRange(listToRemove);
                    ctx.SaveChanges();
                }
            }


            // Add all the Items Received
            //
            for (int i = 0; i < ImageList.Length; i++)
			{
                string fileName= ImageList[i];
                if (fileName == "empty")
                    continue;

               
			    Item newPhotoUpload = new Item
                {
                    PickupReff = pickup2Match,
                    PickupID = pickupID,
                     Company = "ZFM",
                     Qty = 1,
                     AddedBy = user.FirstName + " " + user.LastName,
                     AddedDate = pstNow(),
                     Description = "Photo Upload",
                     Picture1 = "http://ztrak.azurewebsites.net/Content/Photos/" + fileName
                };
                
                // Save it 
                db2.Items.Add(newPhotoUpload);

                // Log it
                //
                GraphicsLog graphicLogEntry = new GraphicsLog
                {

                    User = user.FirstName + " " + user.LastName,
                    Date = pstNow(),
                    DeviceIP = Request.UserHostAddress,
                    Team = user.TeamName,
                    Picture = "http://ztrak.azurewebsites.net/Content/Photos/" + fileName,
                    Size = fileList[i].ContentLength,
                    Pickup = PickupNumber,
                    Item = "Photo Upload"
                };

                // Save it 
                db2.GraphicsLogs.Add(graphicLogEntry);

			}

            try
            {
                db2.SaveChanges();
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
                // Provide for exceptions.
            }

         
            #endregion Database Update

            // Alert the users that an Update has taken place
            //
            string fullName = user.FirstName + " " + user.LastName;

            var hub = Microsoft.AspNet.SignalR.GlobalHost.ConnectionManager.GetHubContext<ZTRAK.Hubs.PickupHub>();
            hub.Clients.All.newDataUpdate(fullName, PickupNumber);


            return Json(PickupNumber);
            // return Json(files.Select(x => new { name = x.FileName }));
            //return RedirectToAction("/", new { pID = pickupID });

        }

        // Search Engine for Typeahead
        //
        [Authorize]
        public JsonResult RemovePickup(string pickupID)
        {
            string result = "";

            if (String.IsNullOrEmpty(pickupID))
            {
                result = "failure";

                return Json(result, JsonRequestBehavior.AllowGet);

            }
            else
            {

                // Convert string to integer
                //
                int pickID = Convert.ToInt16(pickupID);

                // Locate the Pick and Remove It
                //
                using (var ctx = new ZtrakEntities())
                {

                    var Pickup2Remove = (from p in ctx.Pickups
                                         where p.PickupNumber  == pickID
                                         select p);

                    // Mark Pickup deleted
                    //
                    foreach (var pickup in Pickup2Remove)
                    {
                        // First the pickup
                        pickup.Status = "Deleted";

                        // then all the pictures if any
                        foreach (var item in pickup.Items)
                        {
                            // Get file and erase
                            if (!String.IsNullOrEmpty(item.Picture1))
                            {
                                // Get file name
                                var file = Path.GetFileName(item.Picture1);
                                // Create Path

                                var path = Path.Combine(Server.MapPath("/Content/Photos/"), file);

                                // Erase File
                                FileInfo fi1 = new FileInfo(path);

                                if (fi1.Exists)     // check  if its there and delete
                                    fi1.Delete();

                            }
                        }

                    }




                    if (Pickup2Remove.Count() >= 1)
                    {
                        ctx.SaveChanges();

                        result = "success";
                    }
                }

            }


            // Get Pickup Number
            //
            string removedPickup = pickupID;

            string currentUserId = User.Identity.GetUserId();
            ApplicationUser currentUser = db.Users.FirstOrDefault(x => x.Id == currentUserId);
            // Get user's full name to notify others
            //
            string fullName = currentUser.FirstName + " " + currentUser.LastName;


            // Send Message To All Users To Update Pickups
            //
            var hub = Microsoft.AspNet.SignalR.GlobalHost.ConnectionManager.GetHubContext<Hubs.PickupHub>();
            hub.Clients.All.pickupRemoved(fullName, removedPickup);

            // Send this to the Jquery control
            return Json(result, JsonRequestBehavior.AllowGet);

        }


        // Search Engine for Typeahead
        //
        [Authorize]
        public JsonResult SearchAgent(string search)
        {

            #region  Handle Empty String and Prep Search Type
            //
            if (search == null)
            {
                return Json("Empty", JsonRequestBehavior.AllowGet);
            }
            // Deserialize Object
            //
            string[] query = search.Split('-');
            // Select correct function based on the send parameter
            //
            string searchTeamName = "NA";
            if (query.Length > 2)
                searchTeamName = query[2];

            string searchQuery = query[1];
            string searchContent = query[0];

            //
            #endregion

            #region Search For Location
            //
            if (searchQuery == "location")
            {
                
                var result = db2.Locations
                               .Where(r => r.Name.Length > 0 && r.Company == "ZFM")
                               .Select(r => new { label = r.Name.ToUpper() }).Distinct();

                // Send this to the Jquery control
                return Json(result, JsonRequestBehavior.AllowGet);
            }

            #endregion

            #region Search For Destination
            //
            if (searchQuery == "destination")
            {
                // Limit return to the first five matches
                var result = db2.Locations
                               .Where(r => r.Name.Length > 0 && r.Company == "ZFM")
                               .Select(r => new { label = r.Name.ToUpper() }).Distinct();

                // Send this to the Jquery control
                return Json(result, JsonRequestBehavior.AllowGet);
            }

            #endregion

            #region Search For Items
            //
            if ((searchQuery == "items"))
            {


                // Limit return to the first five matches
                var result = db2.Items
                                .Where(r => r.Description.Contains(searchContent) && r.Company == "ZFM")
                                .Take(5)
                                .Select(r => new { label = r.Description }).Distinct();

                // Send this to the Jquery control
                return Json(result, JsonRequestBehavior.AllowGet);

            }

            #endregion

            #region Search For Sales Reps
            //
            if ((searchQuery == "reps"))
            {

                var result =    from r in db2.AspNetUsers
                                 where (r.FirstName + " " + r.LastName).Contains(searchContent) &&
                                 r.TeamName != null && r.Company == "ZFM" && !r.Notes.Contains("disabled")
                                 select new { label = r.FirstName + " " + r.LastName };

                if (searchTeamName.ToLower().Contains("courier") || searchTeamName.ToLower().Contains("warehouse"))
                {

                    // Send Teams for which user belongs
                    //
                    result = from r in db2.AspNetUsers
                                 where (r.FirstName + " " + r.LastName).Contains(searchContent) &&
                                 r.TeamName != null && r.Company == "ZFM" && !r.Notes.Contains("disabled")
                                 select new { label = r.FirstName + " " + r.LastName };
                }
                else
                {
                    // Send Teams for which user belongs
                    //
                    result = from r in db2.AspNetUsers
                                 where (r.FirstName + " " + r.LastName).Contains(searchContent) &&
                                 r.TeamName == searchTeamName && r.Company == "ZFM" && !r.Notes.Contains("disabled")
                                 select new { label = r.FirstName + " " + r.LastName };
                }
              



                // Send this to the Jquery control
                return Json(result, JsonRequestBehavior.AllowGet);

            }

            #endregion

            #region Search For Couriers
            //
            if ((searchQuery == "couriers"))
            {

                // Limit return to the first five matches
                var result = db2.AspNetUsers
                                .Where(r => (r.FirstName + " " + r.LastName).Contains(searchContent) && r.TeamName.ToLower().Contains("courier") && r.Company == "ZFM")
                                .Take(8)
                                .Select(r => new { label = r.FirstName + " " + r.LastName }).Distinct();

                // Send this to the Jquery control
                return Json(result, JsonRequestBehavior.AllowGet);

            }

            #endregion

            #region Search For Status
            //
            if ((searchQuery == "status"))
            {

                //Show All Diffrent Status Options
                var result = db2.Pickups
                                .Where(r => r.Status.Contains(searchContent) && r.Company == "ZFM")
                                .Select(r => new { label = r.Status }).Distinct();

                // Send this to the Jquery control
                return Json(result, JsonRequestBehavior.AllowGet);

            }

            #endregion

            #region Search For Warehouse
            //
            if ((searchQuery == "warehouse"))
            {

                // Limit return to the first five matches
                var result = from r in db2.AspNetUsers
                             where (r.FirstName + " " + r.LastName).Contains(searchContent) &&
                             r.TeamName.Contains("Warehouse") && r.Company == "ZFM" 
                             select new { label = r.FirstName + " " + r.LastName };

                // Send this to the Jquery control
                return Json(result, JsonRequestBehavior.AllowGet);

            }

            #endregion

            #region Search For Sales Reps
            //
            if ((searchQuery == "teams"))
            {

                // Limit return to the first five matches
                var result = from r in db2.Teams
                             where r.TeamName.Length > 0 && r.Company == "ZFM" 
                             select new { label = r.TeamName };


                // Send this to the Jquery control
                return Json(result, JsonRequestBehavior.AllowGet);

            }

            #endregion

            // Send this to the Jquery control
            return Json("Empty", JsonRequestBehavior.AllowGet);

        }

        public string setupViewForUser()
        {
            // This functions eliminates duplicate code when retriving the user names for attributes in the View
            //

            #region Get User Info
            // Get the user ROLE since it's not available in the table - Needed in case any of these attrubutes
            // is updated

            if (ViewBag.UserName != User.Identity.Name)
            {
                // get User and set View Variables
                //
                try
                {
                    var user = (from u in db.Users
                                where u.UserName != null && u.UserName == User.Identity.Name
                                select u).First();

                    ViewBag.UserName = user.UserName;
                    ViewBag.FirstName = user.FirstName;
                    ViewBag.LastName = user.LastName;
                    ViewBag.FullName = user.FirstName + " " + user.LastName;
                    ViewBag.UserRole = user.RoleName;
                    ViewBag.UserCellProvider = user.CellCarrier;
                    ViewBag.UserCell = user.CellNumber;
                    ViewBag.UserEmail = user.Email;
                    ViewBag.TeamName = user.TeamName;
                    ViewBag.PinNumber = Helpers.Helpers.Encrypt("3480", user.PinNumber);
                    ViewBag.Code = Helpers.Helpers.Encrypt("3480", user.Notes);
                                  
                    ViewBag.CodeExp = Helpers.Helpers.Encrypt("3480", pstNow().AddHours(8).ToString());

                    return "User Attrubutes Created";

                }
                catch (Exception)
                {

                    Debug.Write("Network down");


                }


            }
            #endregion

            return "User creation failed";

        }

        public string randomName(int stringSize)
        {
            // Generate a new file name to keep them from overwriting each other
            //
            var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            var random = new Random();
            var result = new string(
                Enumerable.Repeat(chars, stringSize)
                          .Select(s => s[random.Next(s.Length)])
                          .ToArray());

            Debug.Write(Environment.NewLine + "Randon Name Generator called. Result:  " + result + Environment.NewLine);

            return result;


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
        static void imgcompression(Image image2Compress, string imagePath, string imgZipped)
        {
            //BMK Image Compresssion
            // Image Received and New File Name Patha and Data fpr new compressed file
            // included

            ImageCodecInfo jpgEncoder = null;
            ImageCodecInfo[] codecs = ImageCodecInfo.GetImageEncoders();
            foreach (ImageCodecInfo codec in codecs)
            {
                if (codec.FormatID == ImageFormat.Jpeg.Guid)
                {
                    jpgEncoder = codec;
                    break;
                }
            }
            if (jpgEncoder != null)
            {
                Encoder encoder = Encoder.Quality;
                EncoderParameters encoderParameters = new EncoderParameters(1);

                long quality = 70;

                EncoderParameter encoderParameter = new EncoderParameter(encoder, quality);
                encoderParameters.Param[0] = encoderParameter;


                string fileOut = imagePath;
                FileStream fs = new FileStream(fileOut, FileMode.Create, FileAccess.Write);

                try
                {
                    image2Compress.Save(fs, jpgEncoder, encoderParameters);
                    fs.Flush();
                    fs.Close();

                }
                catch (Exception ex)
                {

                    Debug.Write(ex.Message);
                }
                
            }


            // Delete the Original
            //
            string cleanFileName = imgZipped.Substring(1);
            string oriPath = imagePath;
            string file2Delete = Path.Combine(imagePath, oriPath);
            Debug.Write("\n" + " -- " + file2Delete);

            //deleteOrigalImage(file2Delete);


        }
    }
}