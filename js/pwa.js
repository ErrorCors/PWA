	/******************************************************************************/
	/* Constants                                                                  */
	/******************************************************************************/

	const INSTALL_BUTTON = document.getElementById("install_button");
	const RELOAD_BUTTON = document.getElementById("reload_button");

	/******************************************************************************/
	/* Listeners                                                                  */
	/******************************************************************************/

	INSTALL_BUTTON.addEventListener("click", installPwa);
	RELOAD_BUTTON.addEventListener("click", reloadPwa);

	/******************************************************************************/
	/* Global Variable                                                            */
	/******************************************************************************/

	let beforeInstallPromptEvent;

	/******************************************************************************/
	/* Main                                                                       */
	/******************************************************************************/

	main();

// La fonction main vérifie si l'écran est en display-mode donc en PWA si oui
// elle lance registerServiceWorker sinon elle lance les event
	function main()
	{
		console.debug("main()");

		if(window.matchMedia("(display-mode: standalone)").matches)
		{
			console.log("Running as PWA");

			registerServiceWorker();
		}
		else
		{
			console.log("Running as Web page");

			//  Lance l'event juste avant que le navigateur propose l'install
			window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
			// Lance quand le user a installé l'appli
			window.addEventListener("appinstalled", onAppInstalled);
		}
	}

	/******************************************************************************/
	/* Install PWA                                                                */
	/******************************************************************************/

	// Appel de cette fonction seulement lorsqu'on est hors PWA
	function onBeforeInstallPrompt(event)
	{
		console.debug("onBeforeInstallPrompt()");
		// empêche le comportement par défaut de l'event
		event.preventDefault();
		// Fais apparaître la boîte installer
		document.getElementById("show-dialog").disabled = false;
		beforeInstallPromptEvent = event;
	}

	/**************************************/
	// async car await dedans
	async function installPwa()
	{
		console.debug("installPwa()");

		// Attend que beforeInstallPromptEvent.prompt() soit executé
		// et qu'il est retourné le résultat en entier avant de def RESULT
		const RESULT = await beforeInstallPromptEvent.prompt();


		// switch case par rapport à la valeur de RESULT
		switch(RESULT.outcome)
		{
			case "accepted": console.log("PWA Install accepted"); break;
			case "dismissed": console.log("PWA Install dismissed"); break;
		}

		document.getElementById("show-dialog").disabled = true;

		// Enlève l'eventlistener sur la fenêtre
		window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
	}

	/**************************************/

	function onAppInstalled()
	{
		console.debug("onAppInstalled()");

		registerServiceWorker();
	}

	/******************************************************************************/
	/* Register Service Worker                                                    */
	/******************************************************************************/

	// La fonction regarder s'il y a un service worker dans le navigateur
	// et si oui si celui-ci a été mis à jour alors on l'Update
	// sinon on mets en erreur
	async function registerServiceWorker()
	{
		console.debug("registerServiceWorker()");

		// Si le navigateur permet les serviceWorker
		if("serviceWorker" in navigator)
		{
			console.log("Register Service Worker…");

			try
			{
				// Attend que la fonction navigator.serviceWorker.register("./service_worker.js"); soit terminé
				// + essaie de voir si il existe sinon error
				const REGISTRATION = await navigator.serviceWorker.register("https://srv-peda2.iut-acy.univ-smb.fr/mermillq/tracker/service-worker.js");
				// Si REGISTRATION  a changé la système lance la fonction onUpdateFound
				REGISTRATION.onupdatefound = onUpdateFound;

				console.log("Service Worker registration successful with scope:", REGISTRATION.scope);
			}
			// si le try fonctionne pas
			catch(error)
			{
				console.error("Service Worker registration failed:", error);
			}
		}
		else
		{
			console.warn("Service Worker not supported…");
		}
	}

	/******************************************************************************/
	/* Update Service Worker                                                    */
	/******************************************************************************/

	// Update le serviceWorker
	function onUpdateFound(event)
	{
		console.debug("onUpdateFound()");

		const REGISTRATION = event.target;
		const SERVICE_WORKER = REGISTRATION.installing;
		// Quand il installe le nouveau serviceWorker il suit l'avancé comme pour l'API
		SERVICE_WORKER.addEventListener("statechange", onStateChange);
	}

	/**************************************/

	function onStateChange(event)
	{
		const SERVICE_WORKER = event.target;

		console.debug("onStateChange", SERVICE_WORKER.state);

		// Si il a bien installé le serviceWorker et qu'il fonctionne sur le navigateur alors il propose l'update
		// avec le petit bouton reload
		if(SERVICE_WORKER.state == "installed" && navigator.serviceWorker.controller)
		{
			console.log("PWA Updated");
			RELOAD_BUTTON.disabled = false;
		}
	}

	/**************************************/

	function reloadPwa()
	{
		console.debug("reloadPwa()");
		// reload la page
		window.location.reload();
	}
