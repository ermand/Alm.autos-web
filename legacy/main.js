
        var url = 'https://wati-integration-service.clare.ai/ShopifyWidget/shopifyWidget.js?47106';
        var s = document.createElement('script');
        s.type = 'text/javascript';
        s.async = true;
        s.src = url;
        var options = {
      "enabled":true,
      "chatButtonSetting":{
          "backgroundColor":"#dcafff",
          "ctaText":"Contact Us",
          "borderRadius":"25",
          "marginLeft":"0",
          "marginBottom":"50",
          "marginRight":"50",
          "position":"right"
      },
      "brandSetting":{
          "brandName":"ALM Autos",
          "brandSubTitle":"The team typically replies in a few minutes.",
          "brandImg":"whatsappimg.png",
          "welcomeText":"Hi there!\nHow can I help you?",
          "backgroundColor":"#6b1122",
          "ctaText":"Contact",
          "borderRadius":"25",
          "autoShow":false,
          "phoneNumber":"355685658888"
      }
    };
        s.onload = function() {
            CreateWhatsappChatWidget(options);
        };
        var x = document.getElementsByTagName('script')[0];
        x.parentNode.insertBefore(s, x);




        const btn = document.getElementById('button');

        document.getElementById('form')
          .addEventListener('submit', function(event) {
            event.preventDefault();
        
            // Marrim të gjitha input-et dhe textarea nga forma
            const inputs = this.querySelectorAll('input, textarea');
            let allFilled = true;
        
            inputs.forEach(input => {
              if (input.value.trim() === '') {
                allFilled = false;
              }
            });
        
            // Nëse ka fusha bosh, japim mesazh dhe ndalojmë dërgimin
            if (!allFilled) {
              Swal.fire({
                icon: 'warning',
                title: 'Incomplete!',
                text: 'Please fill in all the required fields before submitting.',
              });
              return;
            }
        
            btn.value = 'Sending...';
        
            const serviceID = 'default_service';
            const templateID = 'template_dvotpdj';
        
            emailjs.sendForm(serviceID, templateID, this)
              .then(() => {
                btn.value = 'Send Email';
                Swal.fire({
                  icon: 'success',
                  title: 'Success!',
                  text: 'Your message was sent successfully!',
                });
                
                this.reset(); // pastron formën
                if (Notification.permission === "granted") {
                  new Notification("Booking Received", {
                    body: "You have received a new booking request!",
                    icon: "logo1.jpeg" // opsionale: vendos ikonën tënde
                  });
                }
                
              }, (err) => {
                btn.value = 'Send Email';
                alert(JSON.stringify(err));
              });
          });


          if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
          }
          
        