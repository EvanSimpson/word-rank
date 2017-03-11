(function(){
  var form = document.getElementById('refresh-form');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var formButton = document.getElementById('refresh-button');
    formButton.className += ' disabled';
    formButton.disabled = true;
    fetch('/refresh', {method: 'POST'})
      .then(function() {
        location.reload();
      });
  });
})()
