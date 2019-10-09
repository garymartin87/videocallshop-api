const express = require('express');
const router = express.Router();

const { check } = require('express-validator');

// controllers
const authenticationCtrl = require('../controllers/authentication');
const storeCtrl = require('../controllers/store');
const waitingRoomCtrl = require('../controllers/waitingRoom');
const callCtrl = require('../controllers/call');
const callRequestCtrl = require('../controllers/callRequest');
const purchaseOrderCtrl = require('../controllers/purchaseOrder');
const paymentOptionCtrl = require('../controllers/paymentOption');
const shippingOptionCtrl = require('../controllers/shippingOption');

// middlewares
const paramsValidatorMidd = require('../middlewares/paramsValidator');
const authorizationMidd = require('../middlewares/authorization');
const storeMidd = require('../middlewares/store');
const callRequestMidd = require('../middlewares/callRequest');
const callMidd = require('../middlewares/call');
const purchaseOrderMidd = require('../middlewares/purchaseOrder');

// hello
router.get('/', ({ res }) => res.send('videocallshop-api available'));

// authentication
router.post(
    '/authentication/store',
    [check('email').isEmail()],
    paramsValidatorMidd.validateParams,
    authenticationCtrl.authenticateStoreUser
);

// stores
router.get('/stores', storeCtrl.getStores);

router.get(
    '/stores/:storeId',
    [check('storeId').isInt()],
    paramsValidatorMidd.validateParams,
    storeCtrl.getStore
);

// call requests
router.post(
    '/stores/:storeId/call-requests',
    [
        check('storeId').isInt(),
        check('email').isEmail(),
        check('name').matches(/^[ a-zA-ZÀ-ÿ\u00f1\u00d1]*$/i),
        check('lastName').matches(/^[ a-zA-ZÀ-ÿ\u00f1\u00d1]*$/i),
    ],
    paramsValidatorMidd.validateParams,
    storeMidd.storeExists,
    callRequestCtrl.createCallRequest
);

router.get(
    '/stores/:storeId/call-requests/:callRequestId',
    [check('storeId').isInt(), check('callRequestId').isInt()],
    paramsValidatorMidd.validateParams,
    storeMidd.storeExists,
    callRequestMidd.callRequestExists,
    callRequestMidd.isCallRequestFromStore,
    authorizationMidd.checkAuthorization,
    callRequestCtrl.getCallRequest
);

router.delete(
    '/stores/:storeId/call-requests/:callRequestId',
    [check('storeId').isInt(), check('callRequestId').isInt()],
    paramsValidatorMidd.validateParams,
    storeMidd.storeExists,
    callRequestMidd.callRequestExists,
    callRequestMidd.isCallRequestFromStore,
    authorizationMidd.checkAuthorization,
    callRequestCtrl.cancelCallRequest
);

router.patch(
    '/stores/:storeId/call-requests/:callRequestId',
    [
        check('storeId').isInt(),
        check('callRequestId').isInt(),
        check('status').matches('FINISHED'),
    ],
    paramsValidatorMidd.validateParams,
    storeMidd.storeExists,
    callRequestMidd.callRequestExists,
    callRequestMidd.isCallRequestFromStore,
    authorizationMidd.checkAuthorization,
    callRequestCtrl.finishCallRequest
);

// waiting room
router.get(
    '/stores/:storeId/waiting-room',
    [check('storeId').isInt()],
    paramsValidatorMidd.validateParams,
    storeMidd.storeExists,
    authorizationMidd.checkAuthorization,
    waitingRoomCtrl.getWaitingRoom
);

// calls
router.post(
    '/stores/:storeId/calls',
    [check('storeId').isInt(), check('callRequestId').isInt()],
    paramsValidatorMidd.validateParams,
    storeMidd.storeExists,
    callRequestMidd.callRequestExists,
    callRequestMidd.isCallRequestFromStore,
    authorizationMidd.checkAuthorization,
    callCtrl.callClient
);

router.get(
    '/stores/:storeId/calls',
    [check('storeId').isInt()],
    paramsValidatorMidd.validateParams,
    storeMidd.storeExists,
    authorizationMidd.checkAuthorization,
    callCtrl.getCalls
);

router.get(
    '/stores/:storeId/calls/:callId',
    [check('storeId').isInt(), check('callId').isInt()],
    paramsValidatorMidd.validateParams,
    storeMidd.storeExists,
    callMidd.isCallFromStore,
    authorizationMidd.checkAuthorization,
    callCtrl.getCall
);

// shipping options
router.get('/shipping-options', shippingOptionCtrl.getShippingOptions);

//payment options
router.get('/payment-options', paymentOptionCtrl.getPaymentOptions);

// purchase orders
router.get(
    '/stores/:storeId/call-requests/:callRequestId/purchase-orders',
    [check('storeId').isInt(), check('callRequestId').isInt()],
    paramsValidatorMidd.validateParams,
    storeMidd.storeExists,
    callRequestMidd.callRequestExists,
    callRequestMidd.isCallRequestFromStore,
    authorizationMidd.checkAuthorization,
    purchaseOrderCtrl.getPurchaseOrders
);

router.delete(
    '/stores/:storeId/call-requests/:callRequestId/purchase-orders/:purchaseOrderId',
    [
        check('storeId').isInt(),
        check('callRequestId').isInt(),
        check('purchaseOrderId').isInt(),
    ],
    paramsValidatorMidd.validateParams,
    storeMidd.storeExists,
    callRequestMidd.callRequestExists,
    callRequestMidd.isCallRequestFromStore,
    purchaseOrderMidd.purchaseOrderExists,
    purchaseOrderMidd.isPurchaseOrderFromCallRequest,
    authorizationMidd.checkAuthorization,
    purchaseOrderCtrl.deletePurchaseOrder
);

router.post(
    '/stores/:storeId/call-requests/:callRequestId/purchase-orders',
    [
        check('storeId').isInt(),
        check('callRequestId').isInt(),
        check('shippingOptionId').isInt(),
        check('shippingPrice')
            .optional()
            .isDecimal(),
        check('paymentOptionId').isInt(),
        check('province')
            .optional()
            .isAscii(),
        check('city')
            .optional()
            .isAscii(),
        check('address')
            .optional()
            .isAscii(),
        check('items.*.productName').isAscii(),
        check('items.*.productDescription')
            .optional()
            .isAscii(),
        check('items.*.unitPrice').isDecimal(),
        check('items.*.quantity').isDecimal(),
    ],
    paramsValidatorMidd.validateParams,
    storeMidd.storeExists,
    callRequestMidd.callRequestExists,
    callRequestMidd.isCallRequestFromStore,
    authorizationMidd.checkAuthorization,
    purchaseOrderCtrl.createPurchaseOrder
);

module.exports = router;
