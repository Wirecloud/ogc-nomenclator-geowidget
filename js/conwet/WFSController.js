/*
 *     Copyright (c) 2013 CoNWeT Lab., Universidad Politécnica de Madrid
 *
 *     This file is part of the GeoWidgets Project,
 *
 *     http://conwet.fi.upm.es/geowidgets
 *
 *     Licensed under the GNU General Public License, Version 3.0 (the 
 *     "License"); you may not use this file except in compliance with the 
 *     License.
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     under the License is distributed in the hope that it will be useful, 
 *     but on an "AS IS" BASIS, WITHOUT ANY WARRANTY OR CONDITION,
 *     either express or implied; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *  
 *     See the GNU General Public License for specific language governing
 *     permissions and limitations under the License.
 *
 *     <http://www.gnu.org/licenses/gpl.txt>.
 *
 */
use("conwet");

conwet.WFSController = Class.create({
    
    initialize: function(gadget){
        this.gadget = gadget;
        this.parser = null;
        var auto = this.gadget.serviceConfiguration.details[0]["auto"];
        if(auto == null || auto == false){
            this.parser = new conwet.parser.ConfigParser(gadget);
        }else{
            this.parser = new conwet.parser.AutoParser(gadget);
        }
    },
    
    _sendSearchRequest: function (service) {
        this.gadget.clearUI();

        var baseURL = service.url;

        if ((baseURL == "")) {
            this.gadget.showMessage(_("Faltan datos en el formulario."));
            return;
        }

        if (baseURL.indexOf('?') == -1) {
            baseURL = baseURL + '?';
        } else {
            if (baseURL.charAt(baseURL.length - 1) == '&') {
                baseURL = baseURL.slice(0, -1);
            }
        }
        
        var parameters = null;
        var request = this.gadget.serviceConfiguration.request[0];
        if(this._getWFSVersion() === "1.1.0"){
            parameters = {
                "SERVICE": "WFS",
                "VERSION": "1.1.0",
                "REQUEST": "GetFeature",
                "MAXFEATURES": "100"
            };
        }else if(this._getWFSVersion() === "2.0.0"){
            parameters = {
                "SERVICE": "WFS",
                "VERSION": "2.0.0",
                "REQUEST": "GetFeature",
                "COUNT": "100"
            };
        }else{
            this.gadget.showMessage(_("No hay soporte para esta versión del servicio."));
            return;
        }
        
        //Typename is optional (could be using a stored query)
        if(this.gadget.serviceConfiguration.request[0].namespace != null)
            parameters["TYPENAME"] = this._replaceWithOptionsData(request.typename[0].Text);
        
        //Namespace is optional
        if(this.gadget.serviceConfiguration.request[0].namespace != null)
            parameters["NAMESPACE"] = this._replaceWithOptionsData(request.namespace[0].Text);
        
        //Filter is optional
        if(this.gadget.serviceConfiguration.request[0].namespace != null)
            parameters["FILTER"] = this._replaceWithOptionsData(request.filter[0].Text);
        
        //Add extra params to the request
        if(request.extraParam != null){
            var extraParams = request.extraParam;
            for(var x = 0; x < extraParams.length; x++){
               parameters[extraParams[x].name] = this._replaceWithOptionsData(extraParams[x].Text);
            }
        }

        this.gadget.showMessage("Solicitando datos al servidor.", true);
        //TODO Gif chulo para esperar
        MashupPlatform.http.makeRequest(baseURL, {
            method: 'GET',
            parameters: parameters,
            onSuccess: function(transport) {
                this.gadget.hideMessage();
                var xmlObject = XMLObjectifier.xmlToJSON(XMLObjectifier.textToXML(transport.responseText));
                this._drawEntities(xmlObject);
            }.bind(this),
            onFailure: function(){
                this.gadget.showError("El servidor no responde.");
            }.bind(this)
        });
    },
    
    /**
     * This function replaces the string with data related to the request.search.option
     * entries in the configuration file. If the name of the option is found between {{}}
     * it will be replaced with the value of the input text. If the name is preceded by
     * "prop", it will be replaced with the text of that option in the configuration file
     */
    _replaceWithOptionsData: function(str){
        var inputs = $$("input.search");
        for(var x = 0; x < inputs.length; x++){
            var id = inputs[x].id;
            var value = inputs[x].getValue();
            var property = inputs[x].readAttribute("data-property");
            str = str.replace("{{"+id+"}}", value);
            str = str.replace("{{prop_"+id+"}}", property);
        }
        return str;
    },

    /**
     * This function shows a list of the results of the search done.
     */
    _drawEntities: function(xmlObject) {
        this.gadget.clearUI();
        
        //Get the features typename (without the prefix)
        var configTypename = this.gadget.serviceConfiguration.request[0].typename[0].Text;
        var pos = configTypename.indexOf(":");
        var typename;
        if(pos >= 0)
            typename = configTypename.substring(pos+1);
        
        else
            typename = configTypename;
        
        
        var entities;
        if(this._getWFSVersion() === "2.0.0")
            entities = xmlObject.member;
        else
            entities = xmlObject.featureMember;
        var nEntities = entities.length;
        
        if(nEntities < 1)
            return;
        
        for (var i=0; i<nEntities; i++) {
            var entity = entities[i][typename][0];

            var div = document.createElement("div");
            $(div).addClassName("feature");

            var context = {
                "div"   : div,
                "entity": entity,
                //"url"   : this.gadget._decodeASCII(json[1].sourceServiceURL),
                //"type"  : json[1].sourceServiceType,
                "self"  : this
            };

            var showInfo = this.gadget.serviceConfiguration.results[0].displayInfo;
            var outputText = this.gadget.serviceConfiguration.results[0].outputText;
            
            div.title = "Send event";
            div.observe("click", function(e) {
                this.self.gadget.sendText(this.self.gadget.parseUtils.getDOMValue(this.entity, outputText[0]));
                this.self._showDetails(this.entity);
                //this.self._selectFeature(this.feature, this.div);
            }.bind(context));
            div.observe("mouseover", function(e) {
                this.div.addClassName("highlight");
            }.bind(context), false);
            div.observe("mouseout", function(e) {
                this.div.removeClassName("highlight");
            }.bind(context), false);
            
            //Show all the info that the config specifies
            var span = document.createElement("span");
            span.innerHTML = this._mulpipleDisplayToHtml(entity, showInfo);
            div.appendChild(span);

            $("list").appendChild(div);
        }
    },
    
    /**
     * This method retuns the HTML given a multiple configuration parameter (that can contain
     * headChar and trailChar attributes) from the configuration file.
     */        
    _mulpipleDisplayToHtml: function(entity, displayConfig){
        //Load the separator character from the service configuration file
        var separator = this.gadget.serviceConfiguration.results[0].separator;
        if(separator == null)
            separator = " ";

        var texto = "";

        for(var x = 0; x < displayConfig.length; x++){

            //Add the separator between fields
            if(texto != null && texto != "")
                texto += separator;

            //If a headchar is defined, add it before the field.
            if(displayConfig[x].headChar != null)
                texto += displayConfig[x].headChar;

            //Add the field text
            texto += this.gadget.parseUtils.getDOMValue(entity, displayConfig[x]);

            //If a trailChar is defined, add it after the field
            if(displayConfig[x].trailChar != null)
                texto += displayConfig[x].trailChar;
        }

        return texto;
    },
            
            /*
     * Displays more info about the selected entry in the list of features.
     */
    _showDetails: function(entity) {
        $("info").innerHTML = ""; 
        $("info").appendChild(this.parser._entityToHtml(entity));
        
        var srsConfig = this.gadget.serviceConfiguration.results[0].srs[0];
        var srs      = this.gadget.parseUtils.getDOMValue(entity, srsConfig);
        var locationConfig = this.gadget.serviceConfiguration.results[0].location[0];
        var location = this.gadget.parseUtils.getDOMValue(entity, locationConfig).split(" ", 2);
        var locationInfoConfig = this.gadget.serviceConfiguration.results[0].locationInfo;
        var locationInfo = this._mulpipleDisplayToHtml(entity, locationInfoConfig);
        
        //If is WFS 2.0.0 they give me lat/lon
        if(this._getWFSVersion() === "2.0.0")
            location = new OpenLayers.LonLat(location[1], location[0]);
        else
            location = new OpenLayers.LonLat(location[0], location[1]);
        
        if (srs && (srs != "")) {
            location = this.gadget.transformer.advancedTransform(location, srs, this.gadget.transformer.DEFAULT.projCode);
        }

        //Send the location info (location + name)
        this.gadget.sendLocationInfo(location.lon, location.lat, locationInfo);

    },
            
    _getWFSVersion: function(){
        return this.gadget.serviceConfiguration.request[0].version[0].Text;
    }
    
});
