var express = require('express');
var router = express.Router();
const util = require('util');
const execAsync = util.promisify(require('child_process').exec);

// use res.render to load up an ejs view file
// index page 
router.get('/', function(req, res) {

  //Ejecuta de forma async utilizando promesas
  executeCmd('smCmdTool.exe lslicense help producer segue').then(re => {
      
      if(re.length == 2 || re == undefined) {
          console.log('No hay licencias en uso')

          var emptyArray = {
              Lics: []
          };

          return executeCmd('smCmdTool.exe lp').then(totalLics => {
              return parseLicsInUse(emptyArray.Lics, totalLics).then(licNumber => {

                  res.render('../views/index', {
                      licenses : (emptyArray),
                      totalLic : (licNumber)
                  })
              })
          }).catch(error => {console.error(' - ERROR - ', error)})

      } else { 

          return parseResponse(re).then(licencias => {
              //console.log('licencias', licencias)
              return  executeCmd('smCmdTool.exe lp').then(bar => {
                 return parseLicsInUse(licencias.Lics, bar).then(totalLicencias => {

                  //console.log('total lice', totalLicencias);

                  res.render('../views/index', {
                      licenses : (licencias.Lics),
                      totalLic : (totalLicencias)
                  });

              });
              }).catch(error => console.error('- ERROR -', error))
          })
      }
  });
});

/*
@Parsea las licencias en uso devueltas por el command
@smCmdTool.exe lslicense help producer segue
*/
async function parseResponse(licenses){

  //console.log('LICENCIAS -> ' + licenses)

  var licenseJSON = {
      Lics: []
  };

  licenseArray = licenses.match(/[^\r\n]+/g); 
  
  //console.log(licenseArray);

  for (const license of licenseArray){
      if(license != "" && license != undefined && license.length != 0){
          //console.log("Lic > " + license);
          //console.log("SubString > " + license.substring(6, license.length))

          //Remueve segue del string y splitea por espacio
          let trimLic = license.substring(6, license.length).split(" ");

          /*  Params:            
              0 -> Producto
              1 -> Version de producto
              5 -> Si es WB usuario
              8 -> Si es Standard usuario
          */

          //console.log(trimLic[0] + " asd " + trimLic[6]);
          var jsonLicense;

          if(trimLic[0] == "SilkTest_Workbench" || trimLic[0] == "SilkTest_OpenAgent" ){
          //  console.log('Workbench')
          //  console.log(trimLic[0] + " " + trimLic[1])
              jsonLicense = getInfoForWB(trimLic);
          } else {

              jsonLicense = getInfoForStandardLic(trimLic);
          }
      }

      //add parsed lic to Json
      licenseJSON.Lics.push(jsonLicense)
  }

  //console.log("JSON PARSEADO");
  //console.log(JSON.stringify(licenseJSON));
  
  return licenseJSON;
}

function getInfoForStandardLic(splited){

  let product = splited[0] + " " + splited[1];
  let user = splited[8].includes("Default\\") ? splited[8].substring(8, splited[8].length ): splited[8];
  
  var jsonObject = {"product" : product, "user" : user};

  return jsonObject;
}

function getInfoForWB(splited){

  let product = splited[0] + " " + splited[1];
  let user = splited[5];

  var jsonObject = {"product" : product, "user" : user};
  return jsonObject;
}


/*
@ Ejecuta un command de forma async
*/ 
async function executeCmd(command) {
const { stdout, stderr } = await execAsync(command);
console.debug(command, ' output: ', stdout);

return stdout;
}


/*
@ Contabiliza licencias en uso para llenar la tabla de totales
@ arrayLicenciasEnUso > Licencias en uso obtenidas con la ejecucion del primer cmd
@ arrayTotal > Total de licencias registradas en el server
*/
async function parseLicsInUse(arrayLicenciasEnUso, arrayTotal){
  var finalLic = {
      lic_info: []
  };

  var totalUsed = {};
  arrayLicenciasEnUso.forEach(function(i) { totalUsed[i.product] = (totalUsed[i.product]||0) + 1;});
  console.log(totalUsed);


  arrayTotal = arrayTotal.match(/[^\r\n]+/g);
  allLics = [];
  for (const licType of arrayTotal){
      let parsedLic = licType.substring(licType.indexOf('Silk'), licType.length);
      //console.log(parsedLic);
      if(parsedLic.includes('SilkCentralTestManager') || parsedLic.includes('SilkCentralIssueManager') || parsedLic.includes('SilkCentralManualTesting')) {
          allLics.push(parsedLic.replace(/(^[\s]+|[\s]+$)/g, ''))
      } else if (parsedLic.includes('SilkTest_Workbench')) {
          //Reemplaza mas caracteres en blanco
          allLics.push(parsedLic.replace(/(^[\s]+|[\s]+$)/g, '').replace(/\s\s+/g, ' '))
      }
  }

  //Sumariza el total de licencias
  var count = {};
  allLics.forEach(function(i) { count[i] = (count[i]||0) + 1;});
  //console.log(count);

  //agrega al JSON de licencias 
  for (var prop in count) {
      if (count.hasOwnProperty(prop)) { 

          //prop > tipo de licencia
          //count[prop] > cantidad de licencias para ese tipo
          let freeLic;
          let inUse;

          if(totalUsed[prop] != undefined) {
            freeLic = count[prop] - totalUsed[prop];
            inUse = totalUsed[prop];
          } else {
              freeLic = count[prop];
              inUse = 0;
          }

          //pushea info al JSON > tipo de licencia y cantidad
          finalLic.lic_info.push({"lic_type":prop, "lic_total":count[prop], "lic_in_use": inUse, "lic_free":freeLic})
      }
  }

  return finalLic.lic_info;
}


module.exports = router;
