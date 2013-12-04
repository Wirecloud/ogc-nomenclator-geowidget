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

conwet.parser.AutoParser = Class.create({
    
    initialize: function(gadget) {
        this.gadget = gadget;
    },
    
    _entityToHtml: function(entity) {
        var html = document.createElement("div");
        html.className = "featureContainer";
        this._createLevel(entity, html);   
        return html;
    },
    
    _createLevel: function (entity, parent, nodeName){
        
        if(nodeName == null)
            nodeName = "response";
        
        var head = document.createElement('div');
        head.className = "featureHead";
        head.innerHTML = nodeName;
        parent.appendChild(head);
        
        if(entity._attributes != null){
            var attrs = document.createElement('div');
            attrs.className = "featureAttributesContainer";
            entity._attributes.each(function(elem, context){
                var attr = document.createElement('div');
                var val = document.createElement('div');
                attr.innerHTML = elem;
                attr.className = "attribute";
                val.innerHTML = entity[elem];
                val.className = "fieldValue";
                attrs.appendChild(attr);
                attrs.appendChild(val);
            });

            parent.appendChild(attrs);
        }
        
        var fields = document.createElement('div');
        fields.className = "featureFieldsContainer";
        
        if(entity.Text != null && entity.Text != ""){
            var valueDiv = document.createElement("div");
            valueDiv.className = "fieldValue";
            valueDiv.innerHTML = entity.Text;
            fields.appendChild(valueDiv)
        }else{
            var ignore = ["RootName", "Text", "_attributes", "_children", "numberOfFeatures", "typeOf"];
            if(entity._attributes != null){
                entity._attributes.each(function(elem, context){
                    ignore.push(elem);
                });
            }
            
            for(var child in entity){
                if(ignore.indexOf(child) == -1){
                    entity[child].each(function(elem, _){
                        this._createLevel(elem, fields, child);
                    }.bind(this));
                }
            }
        }
        
        parent.appendChild(fields);
        
    }
});