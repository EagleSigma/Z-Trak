

function logUserOut() {

    // Remove all User Info From Local storage
    //
    localStorage.removeItem('name');
    localStorage.removeItem('code');
    localStorage.removeItem('exp');

    document.getElementById('logoutForm').submit();


}