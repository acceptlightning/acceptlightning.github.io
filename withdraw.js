"use strict";function timeout(milliseconds){return new Promise(function(resolve){setTimeout(resolve,milliseconds)})}function generateRandomID(){const arr=new Uint32Array(1);window.crypto.getRandomValues(arr);return arr[0].toString()}function jsonrpc(method,params){const url="https://localhost";return new Promise(function(resolve,reject){const xhr=new XMLHttpRequest;xhr.open("POST",url);xhr.setRequestHeader("Content-Type","application/json");const id=generateRandomID();xhr.onload=function(){if(xhr.status===200){const response=JSON.parse(xhr.responseText);if("result"in response){resolve(response["result"])}else if("error"in response&&"message"in response["error"]){reject({jsonrpcerror:"2.0",url:url,method:method,params:params,type:"lightning",message:response["error"]["message"]})}else{reject({jsonrpcerror:"2.0",url:url,method:method,params:params,type:"unknown",message:xhr.responseText})}}else{reject({jsonrpcerror:"2.0",url:url,method:method,params:params,type:"xhr.status",message:xhr.status})}};xhr.timeout=8e3;xhr.ontimeout=function(){reject({jsonrpcerror:"2.0",url:url,method:method,params:params,type:"timeout",message:"timeout"})};xhr.send(JSON.stringify({jsonrpc:"2.0",id:id,method:method,params:params}))})}async function getLightningResponse(lightningRequestID){const response=await jsonrpc("getLightningResponse",{version:1,lightningRequestID:lightningRequestID});if("responseStatus"in response&&response["responseStatus"]==="Pending"){await timeout(4e3);console.log(response);return getLightningResponse(lightningRequestID)}else{return response}}async function getUserBalance(userID){const getUserBalanceResponse=await jsonrpc("getUserBalance",{version:1,userID:userID});return getUserBalanceResponse["balance"]}async function invoice(msatoshi,description,expiry){const invoiceResponse=await jsonrpc("invoice",{version:1,msatoshi:msatoshi,description:description,expiry:expiry});const lightningResponse=await getLightningResponse(invoiceResponse["lightningRequestID"]);return{invoiceResponse:invoiceResponse,lightningResponse:lightningResponse}}async function getInvoice(invoiceLabel){const getInvoiceResponse=await jsonrpc("getInvoice",{version:1,invoiceLabel:invoiceLabel});const lightningResponse=await getLightningResponse(getInvoiceResponse["lightningRequestID"]);return{getInvoiceResponse:getInvoiceResponse,lightningResponse:lightningResponse}}async function pay(userID,bolt11){const payResponse=await jsonrpc("pay",{version:1,userID:userID,bolt11:bolt11});const lightningResponse=await getLightningResponse(payResponse["lightningRequestID"]);return{payResponse:payResponse,lightningResponse:lightningResponse}}function initTip(){let bolt11="";const tipMeButton=document.getElementById("tipMeButton");const tipMeModalBody=document.getElementById("tipMeModalBody");tipMeButton.addEventListener("click",async function(event){if(bolt11!=""){return}try{const invoiceResult=await invoice("any","tip",2400);let backOffTimeout=4e3;let pollCount=0;const getInvoicePoll=async function(invoiceLabel){if(bolt11===""){bolt11=invoiceResult["lightningResponse"]["bolt11"];QRCode.toDataURL(bolt11,function(error,qrCodeUrl){tipMeModalBody.innerHTML='<input type="text" value="'+bolt11+'"></input>'+'<img src="'+qrCodeUrl+'">'})}try{const getInvoiceResponse=await getInvoice(invoiceLabel);const paid=getInvoiceResponse["lightningResponse"]["invoices"][0]["status"];const expiresAt=getInvoiceResponse["lightningResponse"]["invoices"][0]["expires_at"];console.log("Paid:",paid,"Expires At: ",new Date(expiresAt*1e3));if(paid==="paid"){tipMeModalBody.innerHTML="Thank You!"}else{if((new Date).getTime()>=expiresAt*1e3){tipMeModalBody.innerHTML="Expired, refresh and try again :)"}else{console.log(backOffTimeout);backOffTimeout=Math.floor(backOffTimeout*1.25);await timeout(backOffTimeout);pollCount++;if(pollCount<20){getInvoicePoll(invoiceLabel)}}}}catch(error){if("jsonrpcerror"in error){document.getElementById("error").innerHTML+="Error "+error["method"]+": "+error["message"]+"<br>";document.getElementById("error").style.display="block"}}};getInvoicePoll(invoiceResult["invoiceResponse"]["invoiceLabel"])}catch(error){if("jsonrpcerror"in error){document.getElementById("error").innerHTML+="Error "+error["method"]+": "+error["message"]+"<br>";document.getElementById("error").style.display="block"}}})}document.addEventListener("DOMContentLoaded",async function(){initTip();if(document.cookie.split(";").filter(function(item){return item.trim().indexOf("acceptlightning=")==0}).length){const userID=JSON.parse(document.cookie.replace(/(?:(?:^|.*;\s*)acceptlightning\s*\=\s*([^;]*).*$)|^.*$/,"$1"))["userID"];populateUserBalance(userID);const withdrawButton=document.getElementById("withdrawButton");withdrawButton.addEventListener("click",async function(event){try{withdrawButton.setAttribute("disabled","");document.getElementById("withdrawResult").innerHTML="Pending...";const bolt11=document.getElementById("bolt11").value;const payValue=await pay(userID,bolt11);withdrawButton.removeAttribute("disabled");const balance=await getUserBalance(userID);document.getElementById("earn").style.display="none";document.getElementById("withdraw").style.display="block";const balanceSatoshis=parseInt(balance)*.001;if(balanceSatoshis==1){document.getElementById("balanceInvoice").innerHTML=" "+balanceSatoshis+" satoshi "}else{document.getElementById("balanceInvoice").innerHTML=" "+balanceSatoshis+" satoshis "}if("lightningResponse"in payValue&&payValue["lightningResponse"]["status"]==="complete"){document.getElementById("withdrawResult").innerHTML="Success!";document.getElementById("bolt11").value=""}}catch(error){if("jsonrpcerror"in error){withdrawButton.removeAttribute("disabled");document.getElementById("error").innerHTML+="Error "+error["method"]+": "+error["message"]+"<br>";document.getElementById("error").style.display="block"}if("jsonrpcerror"in error&&error["method"]==="pay"){document.getElementById("withdrawResult").innerHTML=""}}});const scanCanvas=document.getElementById("scanCanvas");const scanCanvasContext=scanCanvas.getContext("2d");const videoElement=document.createElement("video");let streamTracks;let streamOn=false;$("#scanModal").on("shown.bs.modal",function(){navigator.mediaDevices.getUserMedia({video:{facingMode:"environment",width:250,height:250}}).then(function(stream){streamOn=true;streamTracks=stream.getTracks();videoElement.srcObject=stream;videoElement.setAttribute("playsinline",true);videoElement.play();requestAnimationFrame(tick)})});$("#scanModal").on("hidden.bs.modal",function(){if(streamTracks){streamTracks.forEach(function(track){track.stop();streamOn=false})}scanCanvasContext.clearRect(0,0,250,250);document.getElementById("scanWithdrawResult").innerHTML="";document.getElementById("scanError").style.display="none";populateUserBalance(userID)});async function tick(){if(streamOn){scanCanvasContext.drawImage(videoElement,0,0,250,250);const imageData=scanCanvasContext.getImageData(0,0,250,250);const jsQRCode=jsQR(imageData.data,imageData.width,imageData.height,{inversionAttempts:"dontInvert"});if(jsQRCode){const bolt11=jsQRCode["data"];if(streamTracks){streamTracks.forEach(function(track){track.stop();streamOn=false})}document.getElementById("scanWithdrawResult").innerHTML="Pending...";try{const payValue=await pay(userID,bolt11);if("lightningResponse"in payValue&&payValue["lightningResponse"]["status"]==="complete"){document.getElementById("scanWithdrawResult").innerHTML="Success!"}}catch(error){if("jsonrpcerror"in error){withdrawButton.removeAttribute("disabled");document.getElementById("scanError").innerHTML="Error "+error["method"]+": "+error["message"]+"<br>";document.getElementById("scanError").style.display="block"}if("jsonrpcerror"in error&&error["method"]==="pay"){document.getElementById("scanWithdrawResult").innerHTML=""}}}else{timeout(100).then(function(){requestAnimationFrame(tick)})}}}}else{document.getElementById("earn").style.display="block";document.getElementById("withdraw").style.display="none"}async function populateUserBalance(userID){try{const balance=await getUserBalance(userID);if(balance==0){document.getElementById("earn").style.display="block";document.getElementById("withdraw").style.display="none"}else{document.getElementById("earn").style.display="none";document.getElementById("withdraw").style.display="block";const balanceSatoshis=parseInt(balance)*.001;if(balanceSatoshis==1){document.getElementById("balanceInvoice").innerHTML=" "+balanceSatoshis+" satoshi "}else{document.getElementById("balanceInvoice").innerHTML=" "+balanceSatoshis+" satoshis "}}}catch(error){if("jsonrpcerror"in error){document.getElementById("error").innerHTML+="Error "+error["method"]+": "+error["message"]+"<br>";document.getElementById("error").style.display="block"}}}});
