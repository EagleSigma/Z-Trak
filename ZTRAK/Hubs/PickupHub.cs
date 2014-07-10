using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Microsoft.AspNet.SignalR;
using System.Diagnostics;
using System.Threading.Tasks;

namespace ZTRAK.Hubs
{
	public class PickupHub : Hub
	{


        public Task JoinGroup(string groupName)
        {
            Debug.Write(Environment.NewLine + "Connection ID: " + Context.ConnectionId + " has joined group: " + groupName);
            return Groups.Add(Context.ConnectionId, groupName);
        }

        public Task LeaveGroup(string groupName)
        {
            Debug.Write(Environment.NewLine + "Connection ID: " + Context.ConnectionId + " has left group: " + groupName);
            return Groups.Remove(Context.ConnectionId, groupName);
        }

        public void webTransport(string requestBy)
		{
			#region Web Transport

			Debug.Write("Web Traport Function called by " + requestBy);

			// Find out what Transport Method is being used
			//
			var queryString = Context.Request.QueryString;
			string webTransport = queryString["transport"];


			if (webTransport.ToLower().StartsWith("websock"))
			{
				webTransport = "Fast";
			}
			else if (webTransport.ToLower().StartsWith("long"))
			{
				webTransport = "Medium";
			}
			else
			{

				webTransport = "Slow";
			}

		   Clients.All.webSpeed(webTransport);
			#endregion

		}

         public async Task Ping(string requestBy)
		 {

             // Find out what Transport Method is being used
             //
             var queryString = Context.Request.QueryString;
             string transportMethod = queryString["transport"];

             // Call the sender 
             await Clients.Caller.pingReceived(requestBy, transportMethod);
             
             // Check if Clients are still connected
			 //
             Debug.Write(Environment.NewLine + "Ping from " + requestBy + " received.");


  		 }

         public async Task Send(string updatedBy)
		{
			// Send the alert to anyone conencted
			//
			await Clients.Others.newDataUpdate(updatedBy);
			Debug.Write( Environment.NewLine + "Function Send called by: " + updatedBy + Environment.NewLine);

		}

		
	}
}