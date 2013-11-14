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

conwet.Gadget = Class.create({

    initialize: function() {
        
        this.locationInfoEvent = new conwet.events.Event('location_info_event');
        this.outputTextEvent   = new conwet.events.Event('output_text_event');
        this.searchTextEvent   = new conwet.events.Event('search_text_event');
        
        this.controller = null;

        // Attributes
        this.messageManager = new conwet.ui.MessageManager(3000);
        this.transformer    = new conwet.map.ProjectionTransformer();
        
        this.parseUtils = new conwet.parser.ParseUtils();
        
        this.serviceConfiguration = null; //Contains the configuration of the service in use
        this.serviceConfigurationList = []; //Contains the configuration of all the services
        
        //Drwa the widget
        this.servicesPreference = MashupPlatform.widget.getVariable("services");
        this.draw();
        
        //Now, start listening for events in the slots
        this.searchTextSlot    = new conwet.events.Slot('search_text_slot', function(text) {
            var data;
            try{
                data = JSON.parse(text);
            }catch(e){
                data = text;
            }
            var inputs = $$("input.search");
            
            if(inputs.length > 0){
                if(typeof data == "string"){
                    inputs[0].setValue(data);
                }else if(data != null && data.length > 0){
                    for(var x = 0; x < inputs.length && x < data.length; x++)
                        inputs[x].setValue(data[x]);
                }
                this.launchSearch();
            }
        }.bind(this));
        
        this.wfsServiceSlot   = new conwet.events.Slot('wfs_service_slot', function(service) {
            service = JSON.parse(service);

            if ((typeof service == 'object') && ('type' in service) && ('url' in service) && ('service_type' in service) && ('name' in service) && (service.type == "WFS") && (service.url != "")) {
                this.loadNewService(service, true);
            }
        }.bind(this));
        
        this.configSlot   = new conwet.events.Slot('config_slot', function(service) {
            service = JSON.parse(service);
            if ((typeof service == 'object') && ('type' in service) && ('url' in service) && ('service_type' in service) && ('name' in service) && (service.type == "WFS") && (service.url != "")) {
                this.loadNewService(service, true);
            }
        }.bind(this));

        

        
    },

    draw: function() {
        var header = $("header");
        conwet.ui.UIUtils.ignoreEvents(header, ["click", "dblclick"]);

        var serviceLabel = document.createElement("div");
        $(serviceLabel).addClassName("label");
        serviceLabel.appendChild(document.createTextNode(_("Servicio WFS:")));
        header.appendChild(serviceLabel);

        //Service selector
        this.serviceSelect = new StyledElements.StyledSelect();
        this.serviceSelect.addEventListener("change", function(){
            if(this.serviceSelect.getValue() != "")
                this.setWfsService(JSON.parse(this.serviceSelect.getValue()));
        }.bind(this));
        this.serviceSelect.addClassName("service");
        this.serviceSelect.textDiv.hide();
        this.serviceSelect.insertInto(header);
        
        //Draw all the search options
        var searchOptionsContainer = document.createElement("div");
        $(searchOptionsContainer).addClassName("searchOptions");
        header.appendChild(searchOptionsContainer);
        this.drawSearchOptions();

        this.serviceSelect.addEntries([{label: _('Select a server'), value: ''}]);

        if (this.servicesPreference.get() != "") {
            var services = JSON.parse(this.servicesPreference.get());

            for (var i=0; i<services.length; i++) {
                this.loadNewService(services[i], i==0);
            }
        }
       
    },
    
    drawSearchOptions: function(){

        var content = $$(".searchOptions")[0].childElements();
        if(content != null){
            content.each(function(element){
                element.remove();
            });
        }
        
        if(this.serviceConfiguration != null){
            var searchOptions = this.serviceConfiguration.request[0].search[0].option;
            for(var x = 0; x < searchOptions.length; x++){

                var searchOption = searchOptions[x];

                var searchLabel = document.createElement("div");
                $(searchLabel).addClassName("label");
                searchLabel.appendChild(document.createTextNode(_(searchOption.label)));
                $$(".searchOptions")[0].appendChild(searchLabel);

                /* Por ahora no permito que haya búsquedas con parámetros opcionales
                //Select with the properties that can be used to search in this service
                this.propertySelect = new StyledElements.StyledSelect({"onChange": function(){}});
                this.propertySelect.textDiv.hide();
                //this.propertySelect.addClassName("search"); TEMPORAL!!
                this.propertySelect.addClassName("hidden"); //TEMPORAL!!
                this.propertySelect.addEntries([{label: _('Search by'), value: ''}]);
                this.propertySelect.insertInto($$(".searchOptions")[0]);

                */

                //$(this.propertySelect).hide(); //Temporal

                var searchDiv = document.createElement("div");
                $(searchDiv).addClassName("search");
                $$(".searchOptions")[0].appendChild(searchDiv);

                //Text input containing the text to be searched
                var searchInput = document.createElement("input");
                searchInput.type = "text";
                searchInput.id = searchOption.id;
                searchInput.onkeydown = function(k){
                    if(k.keyCode == 13)
                        this.launchSearch();
                }.bind(this);
                $(searchInput).addClassName("search");
                $(searchInput).setAttribute("data-property", searchOption.Text);
                searchDiv.appendChild(searchInput);
                
            }
            
            var searchButton = conwet.ui.UIUtils.createButton({
                "classNames": ["search_button"],
                "title"     : _("Buscar topónimo"),
                "value"     : _("Buscar"),
                "onClick"   : this.launchSearch.bind(this)
            });
            $$(".searchOptions")[0].appendChild(searchButton);
        }
    },
    
    /**
     * This function starts a new search
     */
    launchSearch: function(){
        var inputs = $$("input.search");
        var sendValues = [];
        for(var x = 0; x < inputs.length; x++){
            sendValues.push(inputs[x].getValue());
        }
        this.sendSearch(JSON.stringify(sendValues));
        this.controller._sendSearchRequest(JSON.parse(this.serviceSelect.getValue()));
    },

    /*
     * This functions adds a WFS service to the select. If added, returns true, othrewise returns false.
     */
    loadNewService: function(service, selected) {
        var serviceJson = JSON.stringify(service);
        
        //Add it if it already isn't in the select
        if(!(serviceJson in this.serviceSelect.optionValues)){
            
            if(service.xmlText != null){
                var configuration = XMLObjectifier.xmlToJSON(XMLObjectifier.textToXML(service.xmlText));
                this.addNewService(service, configuration, selected);
            }else{
                //Load the configuration of the service
                new Ajax.Request(servicesAssociations[service.url], {
                    method: 'GET',
                    onSuccess: function(transport) {

                        var configuration = XMLObjectifier.xmlToJSON(transport.responseXML);

                        this.addNewService(service, configuration, selected);

                    }.bind(this),
                    onFailure: function(transport) {
                        this.showMessage(_("Error al cargar la configuración del servicio"));
                    }.bind(this)
                });
            }
        }
        
    },
    
    addNewService: function(service, configuration, selected){
        var serviceJson = JSON.stringify(service);
        
        this.serviceSelect.addEntries([{label: service.name, value: serviceJson}]);
                    
        //Add the configuration to the list of configurations
        this.serviceConfigurationList[service.name] = configuration;

        //Set this as the current service
        if(selected)
            this.setWfsService(service);

        //Tell everything is ok and save the services list (persistent list)
        this.showMessage(_("Se ha recibido un nuevo servidor."));
        this.save(service);  
    },
    
    /*
     * This function changes the current service to the given service
     */
    setWfsService: function(service){
        this.serviceSelect.setValue(JSON.stringify(service));
        
        //Parse the XML configuration to an object
        this.serviceConfiguration = this.serviceConfigurationList[service.name];
        
        /* Por ahora no permito busquedas opcionales
        //Set the search options list
        this.propertySelect.clear();
        try{
            var searchOptions = this.serviceConfiguration.request[0].search[0].option;
            for(var x = 0; x < searchOptions.length; x++){
                var propertyName = searchOptions[x].Text;
                var label = searchOptions[x].label;
                this.propertySelect.addEntries([{label: _(label), value: propertyName}]);
            }
        }catch(e){};
        */
        
        //Create the controller
        if(service.service_type == 'MNE' || service.service_type == 'EGN' || service.service_type == 'INSPIRE')
            this.controller = new conwet.WFSController(this);
        else
            this.showMessage(_("Tipo de servicio desconocido"));
        
        //Redraw the search options available for this service
        this.drawSearchOptions();
        
        //Clean the list of results
        this.clearUI();
    },

    /*
     * This function saves the service in a persistent list.
     */
    save: function(service) {
        var services = [];
        if(this.servicesPreference.get() != "")
            services = JSON.parse(this.servicesPreference.get());
        
        var found = false;
        for(var i = 0; i < services.length; i++){
            if(services[i].url == service.url)
                found = true;
        }
        
        if(!found){
            services.push(service);
            this.servicesPreference.set(JSON.stringify(services));
        }
    },

    /*
     * This function sends and event with the location info
     */
    sendLocationInfo: function(lon, lat, title) {
        this.locationInfoEvent.send(JSON.stringify([{
            lon: lon,
            lat: lat,
            coordinates: lon + "," + lat,
            title: title
        }]));
    },

    sendText: function(text) {
        this.outputTextEvent.send(text);
    },

    sendSearch: function(text) {
        this.searchTextEvent.send(text);
    },

    

    _selectFeature: function(feature, element) {
        this._deselectAllFeatures();
        element.addClassName("selected");
        this._showDetails(feature);
    },

    _deselectAllFeatures: function() {
        var features = $("chan_items").childNodes;
        for (var i=0; i<features.length; i++) {
            features[i].removeClassName("selected");
        }
    },

    _clearDetails: function() {
        $("info").innerHTML = "";
    },

    clearUI: function() {
        this._clearDetails();
        $("list").innerHTML = "";
    },

    showMessage: function(message, permanent) {
        this.messageManager.showMessage(message, conwet.ui.MessageManager.INFO, permanent);
    },

    hideMessage: function() {
        this.messageManager.hideMessage();
    },

    showError: function(message, permanent) {
        this.messageManager.showMessage(message, conwet.ui.MessageManager.ERROR, permanent);
    }

});
