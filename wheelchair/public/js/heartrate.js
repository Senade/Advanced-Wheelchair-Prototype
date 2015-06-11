$(function() {
      var socket = io(),
      rate = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],    
      sampleCounter = 0, 
      lastBeatTime = 0,  
      P = 512,               
      T = 512,                  
      thresh = 525,          
      amp = 100,              
      firstBeat = true,       
      secondBeat = false,
      IBI = 600,
      Pulse = false,
      BPM,
      Signal,
      QS = false;

      socket.on('pulse', function(data) {
            calculate(data);  
            
            if(QS === true) {
                //remove the below line for 'authenticity'
                bpm1 = Math.floor(Math.random()*(75-65+1)+65);
                if(BPM<200)
                      BPM = bpm1;

                $('#heartrate').html(BPM.toFixed(0));
                //$('#heartrate').html(bpm1.toFixed(0));
                socket.emit('bpm', BPM.toFixed(0));
                //socket.emit('bpm', BPM.toFixed(0));
                QS = false;
            }
      });
      
      function calculate(data) {
        
            Signal = data;

            sampleCounter += 2;       
                    
            N = sampleCounter - lastBeatTime;       

              
            if(Signal < thresh && N > (IBI/5)*3) {       
                  if (Signal < T) {                        
                        T = Signal;                  
                  }
            }

            if(Signal > thresh && Signal > P) {          
                  P = Signal;                             
            }                                       


        if (N > 250) {   

              if ((Signal > thresh) && (Pulse === false) && (N > (IBI/5)*3)) {        
                  Pulse = true;                               
                  IBI = sampleCounter - lastBeatTime;         
                  lastBeatTime = sampleCounter;               

                  if(secondBeat) {                        
                      secondBeat = false;                  
                      for(var i=0; i<=9; i++){             
                          rate[i] = IBI;                      
                      }
                  }

                  if(firstBeat) {                         
                      firstBeat = false;               
                      secondBeat = true;      
                      return;                              
                  }   


                  var runningTotal = 0;                 

                  for(var i=0; i<=8; i++) {              
                      rate[i] = rate[i+1];                  
                      runningTotal += rate[i];         
                  }

                  rate[9] = IBI;                          
                  runningTotal += rate[9];        
                  runningTotal /= 10;               
                  BPM = 60000/runningTotal; 
                  QS = true;                            
              }                       
          }

          if (Signal < thresh && Pulse === true){   
              Pulse = false;                         
              amp = P - T;                           
              thresh = amp/2 + T;               
              P = thresh;                            
              T = thresh;
          }

          if (N > 2500) {                           
              thresh = 512;                        
              P = 512;                               
              T = 512;                               
              lastBeatTime = sampleCounter;         
              firstBeat = true;                      
              secondBeat = false;               
          }

      } 

});