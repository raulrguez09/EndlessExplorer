/**
 * File: game.js
 * 
 * Trabajo #1 AGM: Pagina Web 3D 
 * Descripcion: Se ha llevado a cabo la creación de un juego del genero "endless running", ambientado en una
 * nave espacial que tiene el objetivo de sobrevivir viajando por el espacio. Todo este trabajo se ha 
 * desarrollado empleando WebGL y la biblioteca Three.js
 * 
 * @author <@raulrguez09>, 2023
 * 
 */

//***********************************************/
/*  ZONA DE IMPORTS Y DECLARACION DE VARIABLES  */
//***********************************************/

// Modulos de las bibliotecas necesarias
import * as THREE from "../lib/three.module.js";
import {GLTFLoader} from "../lib/GLTFLoader.module.js";
import {TWEEN} from "../lib/tween.module.min.js";
import {GUI} from "../lib/lil-gui.module.min.js";

// Variables estandar de la escena
let renderer, scene, camera;
let cameraControls, effectController;

// Variables para el control del fondo de la escena
let grid, time = 0;
let speedZ = 50, speedX = 0, translateX = 0;
let clock = new THREE.Clock();

// Variables para la gestion de los objetos de la escena
let objectParent, esferaSup, esferaInf, cuerpoCap, bonus, energySphere, bullet, sol;
let asteroid, partMaterial, partAsteroid;
let disparar = false, cargado = false, gunReady = true, cont = 0, load_SounState = false;

// Variables para el control de la informacion de la partida
let health = 10, score = 0; 

// Inicializamos la música y los efectos de sonido
let background_music = new Howl({
  src: ['./music/soundtrack.mp3'],
  loop: true,
  volume: 0.2,
})

let hit_sound = new Howl({
  src: ['./music/hit.mp3'],
  volume: 0.3,
})

let bonus_sound = new Howl({
  src: ['./music/reward.mp3'],
  volume: 0.5,
})

let shoot_sound = new Howl({
  src: ['./music/shoot.mp3'],
  volume: 0.5,
})

let load_sound = new Howl({
  src: ['./music/load_2.mp3'],
  volume: 0.2,
  loop: true,
})


// Valores de las variables de game-info
let divScore = document.getElementById('score')
let divHealth = document.getElementById('health')
let divLoad = document.getElementById('load')
let divDistance = document.getElementById('distance')
let divgunStatus = document.getElementById('gunStatus')

let divEndPanel = document.getElementById('end-panel')
let divEndScore = document.getElementById('end-score')
let divEndDistance = document.getElementById('end-distance')

// Inicializamos las variables de game-info
divScore.innerText = score
divDistance.innerText = 0
divHealth.value = 100
divLoad.value = 0
divgunStatus.innerText = "Ready!"

// Inicializamos los estados del juego
let jugar = false;
let restart = false;

// Acciones tras pulsar los diferentes botones
document.getElementById('start').onclick = () => {
  jugar = true;
  document.getElementById('intro-panel').style.display = 'none'
}

document.getElementById('restart').onclick = () => {
  jugar = true;
  divEndPanel.style.display = 'none'
}


//***********************************************/
/*     LLAMADA A LAS ACCIONES DE LA ESCENA      */
//***********************************************/
init();
loadScene(restart);
setupGUI();
render();


//***********************************************/
/*   DECLARACIÓN DE LAS FUNCIONES DEL JUEGO     */
//***********************************************/

//---------------------------------------------------------------------//
// Nombre: init                                                        //
// Descripcion: función que instancia las principales variables de la  //
//              escenea (motor de render, nodo raíz de la escena,      //
//              camara) y captura los eventos de teclado               // 
//---------------------------------------------------------------------//
function init(){
  // Instanciar el motor de render
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth,window.innerHeight);
  document.getElementById('container').appendChild( renderer.domElement );
  renderer.antialias = true;
  renderer.shadowMap.enabled = true;

  // Instanciar el nodo raiz de la escena
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0,0,0);

  // Instanciar la camara
  camera= new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,1,100);
  camera.position.z = 5;
  camera.rotateX(-20 * Math.PI / 180)
  camera.position.set(0,1.5,2);

  // Creamos las luces de la escena
  const direccional = new THREE.DirectionalLight(0xFFFFFF,5);
  direccional.position.set(-75,20,-80);
  direccional.castShadow = true;
  scene.add(direccional);

  const light = new THREE.AmbientLight( 0xdbb4f0, 1.1 ); // soft white light
  scene.add( light );

  // Eventos de teclado
  document.addEventListener('keydown', keydown)
  document.addEventListener('keyup', keyup)

  // Ponemos la música de fondo
  background_music.play();
}


//---------------------------------------------------------------------//
// Nombre: update                                                      //
// Descripcion: función que se ejecuta en cada renderización de la     //
//              escena y realiza diversas acciones como modificar la   //
//              geometría de los objetos de la escena, actualizar el   //
//              panel de info, comprobar las colisiones, etc.          //
//---------------------------------------------------------------------//
function update(){
  // Comprobamos si el usuario quiere jugar
  if(jugar){
    // Una vez empieza el juego
    // Calculamos valores del tiempo y velocidad del desplazamiento
    // de la cuadrícula que simula el movimiento 
    time += clock.getDelta();
    translateX += speedX * -0.1;

    grid.material.uniforms.time.value = time;
    speedZ = effectController.velocidad;
    objectParent.position.z = speedZ * time;

    grid.material.uniforms.translateX.value = translateX;
    objectParent.position.x = translateX;
    
    // Comprobamos si los objetos de la nave han sobrepasado a la misma
    objectParent.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Object3D){
        const childZPos = child.position.z + objectParent.position.z;
        if (childZPos > 0){
          // Una vez sobrepasados, los trasladamos de nuevo en frente de la nave
          // modificando su estructura
          if(child.userData.type === 'obstaculo' && child.userData.explosion === 'false'){
            setupObstacle(child, -translateX, -objectParent.position.z)
          }else if(child.userData.type === 'bonus'){
            const price = setupBonus(child, -translateX, -objectParent.position.z)
            child.userData.bonusPrice = price
          }
        }
      }
    });
    
    // Actualizamos la información de la distancia recorrida
    divDistance.innerText = objectParent.position.z.toFixed(0)

    // Comprobamos las posibles colisiones con los objetos de la escena
    checkCollisions()

    // Comprobamos el estado del arma
    if(!gunReady){
      cont++;
      if(cont == 400){
        cont = 0;
        gunReady = true;
        divgunStatus.innerText = "Ready!"
      }
    }

    // Comprobamos si se ha disparado
    if(disparar){
      bullet.position.z -= 0.5
      if(bullet.position.z <= -90){
        disparar = false;
        bullet.material.opacity = 0;
        bullet.position.z = -1.7;
      }
    }
  }
}


//---------------------------------------------------------------------//
// Nombre: checkCollisions                                             //
// Descripcion: función que comprueba si se ha producido una colisión  //
//              con alguno de los objetos de la escena, y realiza las  //
//              funciones oportunas dependiendo del objeto que sea     //
//---------------------------------------------------------------------//
function checkCollisions(){
  // Recorremos los objetos dentro del grupo
  objectParent.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Object3D){
      const childZPos = child.position.z + objectParent.position.z;

      // Calculamos la distancia límite que establecemos para la colisión
      const limiteX = 1.2 + child.scale.x/2;
      const limiteZ = 1.2 + child.scale.z/2;

      const bala = scene.getObjectByName('bala');
      var posBala = new THREE.Vector3(bala.position.x, bala.position.y, bala.position.z);
      var posObst = new THREE.Vector3(child.position.x + objectParent.position.x, child.position.y + objectParent.position.y, child.position.z + objectParent.position.z);

      // Calculamos si se ha producido la colisión
      if(childZPos > -limiteZ && Math.abs(child.position.x - (-translateX)) < limiteX){
        // Realizamos las acciones oportunas si chocamos con un objeto
        if(child.userData.type === 'obstaculo' && !disparar && child.userData.explosion === 'false'){
          hit_sound.play()
          health -= 10
          divHealth.value = health
          setupObstacle(child, -translateX, -objectParent.position.z)
          if(health <= 0){
            gameOver();
          }
        
        // Realizamos las acciones oportunas si chocamos con un bonus
        }else if(child.userData.type === 'bonus' && !disparar){
          bonus_sound.play()
          score += child.userData.bonusPrice
          divScore.innerText = score

          child.userData.bonusPrice = setupBonus(child, -translateX, -objectParent.position.z)
        }
      // Calculamos si la bala a colisionado con un obstaculo
      }else if(posObst.distanceTo(posBala) <= 5 && disparar){
        // Si hay colision realizamos la animacion de epxlosion
        // y reseteamos el obstaculo
        if(child.userData.type === 'obstaculo'){
          child.children[0].visible = false;
          child.children[1].visible = true;
          child.userData.explosion = 'true'
          hit_sound.play()
          animateExplosion(child);
          bala.position.set(0,0.4,-1.7)
          bala.material.opacity = 0
          disparar = false;
        }
      }

    }
  });
}


//---------------------------------------------------------------------//
// Nombre: gameOver                                                    //
// Descripcion: función que muestra el resultado del fin de juego y    //
//              reinicia la escena para poder jugar de nuevo           //
//---------------------------------------------------------------------//
function gameOver(){
  // Modificamos el estado del juego
  // Mostramos los resultados con la pantalla final
  jugar = false;
  divEndScore.innerText = score
  divEndDistance.innerText = objectParent.position.z.toFixed(0)
  setTimeout(() => {
    divEndPanel.style.display = 'grid'
    
    // Reseteamos las variables e iniciamos la escena de nuevo
    jugar = false;
    speedZ = 20, speedX = 0, translateX = 0;
    
    grid, time = 0;
    clock = new THREE.Clock();
    
    health = 10, score = 0;
    
    divScore.innerText = score
    divDistance.innerText = 0
    divHealth.value = 100
    
    restart = true;
    loadScene(restart);
  }, 1000)
}


//---------------------------------------------------------------------//
// Nombre: loadScene                                                   //
// Descripcion: función que crea los diferentes elementos de la escena //
//              como la nave, los obtáculos, los bonus, etc.           //
//---------------------------------------------------------------------//
function loadScene(restart){
  if(!restart){
    //scene.add( new THREE.AxesHelper(3) );
    // Importamos el modelo 3D de la nave a la escena
    // https://sketchfab.com/search?features=downloadable&q=spaceship&type=models
    const gltfLoader2 = new GLTFLoader();
    gltfLoader2.load('./models/nave2/scene.gltf', (gltf) => {
      gltf.scene.name = 'nave';
      gltf.scene.position.set(0,0,0)
      gltf.scene.rotateX(-70 * Math.PI / 180); // rojo
      gltf.scene.rotateZ(45 * Math.PI / 180); // azul
      
      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh){
          child.receiveShadow = true;        
        }
      });
      
      scene.add(gltf.scene)
    });
    
    // Importamos la esfera del disparo
    var esferaBalaGeo = new THREE.SphereGeometry( 0.3,64,32,0 );
    var esferaBalaMat = new THREE.MeshPhongMaterial({ color: 0x00ff00, transparent: true, opacity: 0});
    energySphere = new THREE.Mesh( esferaBalaGeo, esferaBalaMat );
    energySphere.name = "energySphere"
    energySphere.position.set(0, 0.4, -1.18)
    scene.add(energySphere)
    
    // Importamos la bala 
    const balaGeo = new THREE.CapsuleGeometry( 0.1, 0.5, 32, 64 );
    const balaMat = new THREE.MeshBasicMaterial( {color: 0x00ff00, transparent: true, opacity: 0} );
    bullet = new THREE.Mesh( balaGeo, balaMat );
    bullet.rotateX(450 * Math.PI / 180)
    bullet.position.set(0,0.4,-1.7)
    bullet.name = 'bala';
    scene.add(bullet)
    
    // Creamos y establecemos la animación de la
    // cuadrícula de la escena
    setupGrid();
      
    // Creamos el grupo al que pertenecerán los obstaculos
    // y los bonus
    objectParent = new THREE.Group();
    scene.add(objectParent);

    // Creamos los obstáculos y los bonus de la escena
    for( let i = 0; i < 7; i++){
      spawnObstacle();
      spawnBonus();
    }
  
    // Creamos y añadimos el sol a la escena
    var geoSol = new THREE.SphereGeometry( 12,64,32,0 );
    const matSol = new THREE.MeshPhongMaterial({ emissive: 0xffffdf});
    sol = new THREE.Mesh( geoSol, matSol );
    sol.position.set(-85, 20, -90)
    scene.add(sol);

    // Declaramos los shaders para el halo del sol
    const haloVertexShader = `
    varying vec3 vertexNormal;
    void main() {
         vertexNormal = normal;
         gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);   
    }
    `;
    const haloFragmentShader = `
    varying vec3 vertexNormal;
    void main() {
    float intensity = pow(0.9 - dot(vertexNormal, vec3(0, 0, 1.0)), 2.0);
    gl_FragColor = vec4(0.8, 1.0, 0.6, 0.2) * intensity;
    }
    `;

    // Creamos el halo y lo colocamos alrededor del sol
    const halo = new THREE.Mesh(new THREE.SphereGeometry(12,64,32,0),
      new THREE.ShaderMaterial({
          vertexShader:haloVertexShader,
          fragmentShader:haloFragmentShader,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide
      }))
    halo.scale.set(1.2, 1.2, 1.2);
    halo.position.set(-85, 20, -90)
    scene.add(halo);
  
    // Añadimos el fondo de la escena, utilizando la técnica de skyBox
    scene.background = new THREE.CubeTextureLoader().setPath('./images/skybox/').load(
      [
      'right.png', // pos x - right
      'left.png', // neg x - left
      'top.png', // pos y - up
      'bottom.png', // neg y - down
      'back.png', // pos z - back
      'front.png', // neg z - front
      ]
    )
  } else{
    // Al utilizarse el boton de reset
    // Volvemos a colocar los obstaculos y bonus creados
    objectParent.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Object3D){
        if(child.userData.type === 'obstaculo'){
          setupObstacle(child)
        }else if(child.userData.type === 'bonus'){
          child.userData.bonusPrice = setupBonus(child)
        }
      } else{
        child.position.set(0,0,0)
      }
    })
  }
}


//---------------------------------------------------------------------//
// Nombre: setupGrid                                                   //
// Descripcion: función que crea la cuadricula y los shaders que nos   //
//              permitiran simular el movimiento infinito de la misma  //
//---------------------------------------------------------------------//
function setupGrid(){
  // Establecemos y creamos las dimensiones de la cuadrícula
  var division = 30;
  var limit = 200;
  grid = new THREE.GridHelper(limit * 2, division);
  //grid.visible = false

  // Creamos los atributos para depslazar las lineas de la cuadricuña
  var moveable = [];
  var moveableX = [];
  for (let i = 0; i <= division; i++) {
    // movimiento en las lineas verticales 
    moveableX.push(0, 0, 1, 1); 
    // movimiento en las lineas horizontales 
    moveable.push(1, 1, 0, 0); 
  }
  grid.geometry.addAttribute('moveable', new THREE.BufferAttribute(new Uint8Array(moveable), 1));
  grid.geometry.addAttribute('moveableX', new THREE.BufferAttribute(new Uint8Array(moveableX), 1));
  
  // Creamos los shaders necesarios para simular el movimiento
  // https://stackoverflow.com/questions/51470309/three-js-and-infinite-forward-grid-movement
  grid.material = new THREE.ShaderMaterial({
    uniforms: {
      time: {
        value: 0
      },
      limits: {
        value: new THREE.Vector2(-limit, limit)
      },
      speed: {
        value: 5
      },
      translateX: {
        value: translateX
      }
    },
    vertexShader: `
      uniform float time;
      uniform vec2 limits;
      uniform float speed;
      uniform float translateX;
      
      attribute float moveable;
      attribute float moveableX;
      
      varying vec3 vColor;
    
      void main() {
        vColor = color;
        float limLen = limits.y - limits.x;
        vec3 pos = position;
        if (floor(moveableX + 0.5) > 0.5){ // if a point has "moveableX" attribute = 1 
          float xDist = translateX;
          float curXPos = mod((pos.x + xDist) - limits.x, limLen) + limits.x;
          pos.x = curXPos;
        }
        if (floor(moveable + 0.5) > 0.5){ // if a point has "moveable" attribute = 1 
          float dist = speed * time;
          float currPos = mod((pos.z + dist) - limits.x, limLen) + limits.x;
          pos.z = currPos;
        } 
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
    
      void main() {
        gl_FragColor = vec4(vColor, 1.);
      }
    `,
    vertexColors: THREE.VertexColors
  });

  // Añadimos la cuadricula a la escena
  scene.add(grid);
}


//---------------------------------------------------------------------//
// Nombre: setupGUI                                                    //
// Descripcion: función que muestra una interfaz interactiva para      //
//              modificar aspectos del juego como la velocidad o la    //
//              música                                                 //
//---------------------------------------------------------------------//
function setupGUI()
{
	// Definicion de los controles
	effectController = {
		velocidad: 20,
		play: function(){background_music.play();},
		stop: function(){background_music.stop();},
		color: "rgb(150,150,150)"
	};

	// Creacion interfaz
	const gui = new GUI();

	// // Construccion del menu
	const h = gui.addFolder("Game settings");
  h.add(effectController, "velocidad", { 'Fácil': 20, 'Normal': 40, 'Difícil': 60 }).name("Velocidad");
  const i = gui.addFolder("Audio settings");
  i.add(effectController, "stop").name("Stop music");
  i.add(effectController, "play").name("Play music");
}


//---------------------------------------------------------------------//
// Nombre: spawnObstacle                                               //
// Descripcion: función que añade un obstaculo a la escena y al grupo, //
//              además de darle forma llamando a las funciones         //
//              pertinentes                                            //
//---------------------------------------------------------------------//
function spawnObstacle(){
  // Añadimos el obstaculo tanto a la escena como al grupo objectParent
  // Además lo mandamos al método 'setupObstacle' para modificar su geometría
  var asteroidFinal = new THREE.Object3D();

  // Creamos el material del asteroide
  const asteroidtex = new THREE.TextureLoader().load( './images/asteroid3.jpg' );
  var asteroidMat = new THREE.MeshStandardMaterial({
    map: asteroidtex,
    color:0x555555,
    shading: THREE.FlatShading,
  });
  partMaterial = new THREE.PointsMaterial({ color: 0x31c48D, size: 0.5 })

  // Creamos la geometría del asteroide
  var asteroidGeom = new THREE.OctahedronGeometry(2, 2)

  // Creamos el asteroide
  asteroid = new THREE.Mesh(asteroidGeom, asteroidMat)
  asteroid.castShadow = true;
  asteroidFinal.add(asteroid)

  partAsteroid = new THREE.Points(asteroidGeom, partMaterial)
  partAsteroid.visible = false;
  asteroidFinal.add(partAsteroid)
  
  // Modificamos el tam y pos del obstaculo
  setupObstacle(asteroidFinal);

  // Añadimos el objeto al grupo
  objectParent.add(asteroidFinal)
}


//---------------------------------------------------------------------//
// Nombre: setupObstacle                                               //
// Parametros: obstaculo (THREE.Mesh) - malla del obstaculo            //
//             refXPos (Int) - referecia de la pos de la nave con      //
//                             respecto al eje X (inicialmente 0)      //
//             refZPos (Int) - referecia de la pos de la nave con      //
//                             respecto al eje Z (inicialmente 0)      //
// Descripcion: función que modifica el tamaño y la posición del       //
//              obstaculo pasado como parámetro                        //
//---------------------------------------------------------------------//
function setupObstacle(obstaculo, refXPos = 0, refZPos = 0){
  // Establecemos la visibilidad de los hijos del obstaculo
  obstaculo.children[0].visible = true;
  obstaculo.children[1].visible = false;
  
  // Utilizamos un valor aleatorio para modificar el tamaño del obstaculo
  var rand = THREE.MathUtils.randFloat(0.5, 4)
  obstaculo.scale.set(rand, rand, rand)

  // Posicionamos el obstaculo junto en frente de nuestra nave
  obstaculo.position.set(refXPos + THREE.MathUtils.randFloat(-30, 30), obstaculo.scale.y * 0.5, refZPos - 100 - THREE.MathUtils.randFloat(0,100))

  // Añadimos la etiqueta de tipo 'obstaculo' a la malla
  // Además de la etiqueta 'explosion' para conocer el estado de la misma
  obstaculo.userData = { type: 'obstaculo', explosion: 'false'}
}


//---------------------------------------------------------------------//
// Nombre: spawnBonus                                                  //
// Descripcion: función que crea el objeto bonus, dandole forma y      //
//              estableciendo su posición en la escena                 //
//---------------------------------------------------------------------//
function spawnBonus(){
  // Creamos un objeto 3D donde agruparemos las diferentes partes del bonus
  bonus = new THREE.Object3D();

  // Creamos la parte superior del bonus
  esferaSup = new THREE.Mesh(new THREE.SphereGeometry(1,64,32,0,Math.PI),  new THREE.MeshPhongMaterial({color: 0x4B4B4B}));
  esferaSup.rotateX(-90 * Math.PI / 180)
  esferaSup.position.y = 1
  esferaSup.receiveShadow = true; 
  
  // Creamos la parte inferior del bonus 
  esferaInf = new THREE.Mesh(new THREE.SphereGeometry(1,15,20,0,Math.PI),  new THREE.MeshPhongMaterial({color: 0x4B4B4B}));
  esferaInf.rotateX(90 * Math.PI / 180)
  esferaInf.position.y = -1
  esferaInf.receiveShadow = true; 
  
  // Creamos el cuerpo del bonus
  cuerpoCap = new THREE.Mesh(new THREE.CylinderGeometry( 1, 1, 2, 32, 64 ),  new THREE.MeshPhongMaterial({color: 0x2effff}));
  cuerpoCap.receiveShadow = true; 

  // Añadimos las parteas al objeto 3D bonus
  bonus.add(esferaSup)
  bonus.add(esferaInf)
  bonus.add(cuerpoCap)

  // Modificamos el tam y pos del objeto, y el método nos devuelve un precio
  // asociado con el bonus/score que nos dará el bonus modificado
  const price = setupBonus(bonus)

  // Agregamos etiqueta sobre el tipo de objeto y el precio
  bonus.userData = { type: 'bonus', bonusPrice: price}

  // Añadimos el objeto al grupo
  objectParent.add(bonus)
}


//---------------------------------------------------------------------//
// Nombre: setupBonus                                                  //
// Parametros: bonus (THREE.Mesh) - malla del bonus                    //
//             refXPos (Int) - referecia de la pos de la nave con      //
//                             respecto al eje X (inicialmente 0)      //
//             refZPos (Int) - referecia de la pos de la nave con      //
//                             respecto al eje Z (inicialmente 0)      //
// Descripcion: función que modifica el tamaño y la posición del       //
//              bonus, además de devolver el precio/valor del mismo    //
// Return: price (Int) - valor del bonus, el cual sirve para la        //
//                       puntuación del jugador                        //
//---------------------------------------------------------------------//
function setupBonus(bonus, refXPos = 0, refZPos = 0){
  // Utilizamos un valor aleatorio para modificar el tamaño del bonus
  const price = THREE.MathUtils.randInt(5, 20);
  const ratio = price / 20;
  const size = ratio * 0.5;
  bonus.scale.set(size, size, size)

  // Posicionamos el obstaculo junto en frente de nuestra nave
  bonus.position.set(refXPos + THREE.MathUtils.randFloat(-30, 30), bonus.scale.y * 0.5, refZPos - 100 - THREE.MathUtils.randFloat(0,100))

  // Devolvemos el valor/score del bonus
  return price;
}


//---------------------------------------------------------------------//
// Nombre: render                                                      //
// Descripcion: función que realiza la renderización de la escena      //
//---------------------------------------------------------------------//
function render()
{
    requestAnimationFrame(render);
    update();
    TWEEN.update();
    renderer.render(scene,camera);
}


//---------------------------------------------------------------------//
// Nombre: animateShip                                                 //
// Parametros: target (Float) - valor objetido para la rotación        //
//             delay (Float) - valor del retardo de la animacion       //
// Descripcion: función que realiza una animación de rotación de la    //
//              nave, dependiendo del target y el delay pasados como   //
//              parámetros                                             //
//---------------------------------------------------------------------//
function animateShip(target, delay){
  const nave = scene.getObjectByName('nave');
  new TWEEN.Tween(nave.rotation).to({ y: target}, delay)
  .onComplete(function() {
      if (Math.abs(nave.rotation.y)>=2*Math.PI) {
          nave.rotation.y = nave.rotation.y % (2*Math.PI);
      }
  })
  .start();
}


//---------------------------------------------------------------------//
// Nombre: animateExplosion                                            //
// Parametros: child (THREE.Mesh) - malla que contiene las particulas  //
//             escondidas de un obstáculo                              //
// Descripcion: función que realiza la animación de explosión cuando   //
//              una bala intercepta contra uno de los obstaculos. La   //
//              animación consisite en aumentar la escala de las       //
//              particulas escondidas                                  //
//---------------------------------------------------------------------//
function animateExplosion(child){
  var scaleX = child.scale.x
  new TWEEN.Tween(child.scale).to({x: scaleX*10, y: scaleX*10, z: scaleX*10}, 1000)
  .onComplete(function() {child.children[1].visible = false})
  .start();
}


//---------------------------------------------------------------------//
// Nombre: keydown                                                     //
// Parametros: event (Object) - objeto que recoge el evento            //
// Descripcion: función que realiza acciones tras el evento de         //
//              mantener pulado una tecla                              //
//---------------------------------------------------------------------//
function keydown(event){
  let newSpeedX;
    switch (event.keyCode) {
      case 37: //ArrowLeft
        newSpeedX = -1.0;
        break;
      case 39: //ArrowRight
        newSpeedX = 1.0;
        break;
      case 32: //space
        newSpeedX = 0.0;
      if(gunReady){
        if(load_SounState == false){
          load_sound.play();
          load_SounState = true;
        }
          
        if(energySphere.material.opacity <= 1){
          energySphere.material.opacity += 0.02
          divLoad.value = energySphere.material.opacity * 10
        }else{
          cargado = true;
        }
      }  
        break;
      default:
        return;
    }

    if(speedX !== newSpeedX){
      speedX = newSpeedX;
      animateShip(speedX * 20 * Math.PI / 180, 1)
    }
}


//---------------------------------------------------------------------//
// Nombre: keyup                                                       //
// Parametros: event (Object) - objeto que recoge el evento            //
// Descripcion: función que realiza acciones tras el evento de dejar   //
//              de pulsar una tecla                                    //
//---------------------------------------------------------------------//
function keyup(event){
  switch (event.keyCode) {
    case 32: //space
      load_sound.stop();
      load_SounState = false;

      if(cargado){
        energySphere.material.opacity = 0
        divLoad.value = 0
        bullet.material.opacity = 1
        disparar = true;
        load_sound.stop();
        shoot_sound.play();
        cargado = false;
        gunReady = false;
        divgunStatus.innerText = "Recovering..."
      }
      break;
    default:
      speedX = 0;
      break;
  }

  animateShip(0, 0.5)
}
