import postal from "postal";
import _ from "lodash";
import { state, env } from "./state";

export default class XFrameClient extends postal.fedx.FederationClient {

	constructor( ...args ) {
		this.transportName = "xframe";
		super( ...args );
	}

	shouldProcess() {
		const hasDomainFilters = !!state.config.allowedOrigins.length;
		return state.config.enabled &&
			// another frame/window
			( ( this.options.origin === "*" || ( hasDomainFilters && _.includes( state.config.allowedOrigins, this.options.origin ) || !hasDomainFilters ) ) ||
			// worker
			( this.options.isWorker && _.includes( state.workers, this.target ) ) ||
			// we are in a worker
			env.isWorker );
	}

	send( packingSlip ) {
		if ( this.shouldProcess() ) {
			const context = env.isWorker ? null : this.target;
			const args = [ postal.fedx.transports.xframe.wrapForTransport( packingSlip ) ];
			if ( !this.options.isWorker && !env.isWorker ) {
				args.push( this.options.origin );
			}
			if ( !env.isWorker ) {
				if ( args.length === 1 ) {
					this.target.postMessage( args[0] );
				} else {
					this.target.postMessage( args[0], args[1] );
				}
			} else {
				this.target.postMessage.apply( context, args );
			}
		}
	}
}
