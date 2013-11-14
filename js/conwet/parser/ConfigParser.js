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

use("conwet.parser");

conwet.parser.ConfigParser = Class.create({

    initialize: function(gadget) {
        this.gadget = gadget;
    },
    
    
     /*
     * This functions parses a feature object to an styled HTML
     */
    _entityToHtml: function(entity){
        var html = document.createElement("div");
        html.className = "featureContainer";
        
        this._useDetailsLevels(entity, html, this.gadget.serviceConfiguration.details[0]);
        
        return html;
       
    },
            
    /*
     * This function uses the given config (detailslevel) to extract the info
     * from the entity and display it in the parentDiv.
     */
    _useDetailsLevels: function(entity, parentDiv, config){

    var headDiv, fieldsDiv;
                
        var parseInfo = config.detailslevel;
        
        //Stop if it is not needed to display extra info
        if(parseInfo == null)
            return;
        
        //Iterate through sections
        for(var x = 0; x < parseInfo.length; x++){
            
            var head = parseInfo[x].label[0].Text;
            
            headDiv = document.createElement("div");
            fieldsDiv = document.createElement("div");
            
            headDiv.className = "featureHead";
            fieldsDiv.className = "featureFieldsContainer";
            
            headDiv.innerHTML = head;
            
            var fieldDiv = document.createElement("div");
            var valueDiv = document.createElement("div");
            valueDiv.className = "fieldValue";
            fieldDiv.className = "fieldContainer";
            
            if(parseInfo[x].path != null){
                valueDiv.innerHTML = this.gadget.parseUtils.getDOMValue(entity, parseInfo[x].path[0]);
                fieldsDiv.appendChild(valueDiv);
            }else if(parseInfo[x].detailslevel != null){
                this._useDetailsLevels(entity, fieldsDiv, parseInfo[x]);
            }
            
            parentDiv.appendChild(headDiv);
            parentDiv.appendChild(fieldsDiv);
        }
        
    }
    
});
