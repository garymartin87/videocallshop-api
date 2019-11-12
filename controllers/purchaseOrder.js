// models
const callRequestModel = require('../models/callRequest');
const purchaseOrderModel = require('../models/purchaseOrder');
const storeModel = require('../models/store');
const paymentOptionModel = require('../models/paymentOption');
const shippingOptionModel = require('../models/shippingOption');

//helpers
const mercadopagoHelper = require('../helpers/mercadopago');
const emailHelper = require('../helpers/email');

const CALLED = 'CALLED';

const createPurchaseOrder = async (req, res, next) => {
    // authorization
    try {
        const hasAccess = req.authorization.storeUser.thisStore;

        if (!hasAccess) {
            throw new Error('Unauthorized.');
        }
    } catch (err) {
        let myErr = new Error('Unauthorized.');
        myErr.status = 401;
        return next(myErr);
    }

    // check if call request is called
    const { callRequestId } = req.params;
    const callRequest = await callRequestModel.getCallRequest(callRequestId);

    if (!callRequest) {
        throw new Error('Call request not found.');
    }

    if (callRequest.state !== CALLED) {
        const err = new Error('The call request is not in CALLED state.');
        err.status = 400;
        return next(err);
    }

    // create purchase order
    try {
        let {
            shippingOptionId,
            shippingPrice,
            paymentOptionId,
            province,
            city,
            address,
            items,
        } = req.body;

        // if "Retiro en la tienda"
        if (parseInt(shippingOptionId) === 1) {
            shippingPrice = 0;
        }

        // create mercadopago preference
        const mercadopagoItems = [];
        let item;
        for (item of items) {
            mercadopagoItems.push({
                title: item.productName,
                description: item.productDescription,
                quantity: parseInt(item.quantity),
                currency_id: 'ARS',
                unit_price: parseFloat(item.unitPrice),
            });
        }

        const storeId = parseInt(req.params.storeId);
        const store = await storeModel.getStore(storeId);
        const externalReference = callRequest.callRequestId.toString();

        // payment through mercadopago
        let mercadopagoPreference = null;
        if (paymentOptionId === 2) {
            mercadopagoPreference = await mercadopagoHelper.createPreference(
                store.mercadopagoSandboxAccessToken,
                store.mercadopagoClientId,
                store.mercadopagoClientSecret,
                mercadopagoItems,
                externalReference
            );
        }

        // create purchase order
        const purchaseOrderId = await purchaseOrderModel.createPurchaseOrder(
            callRequestId,
            shippingOptionId,
            shippingPrice,
            paymentOptionId,
            province,
            city,
            address,
            mercadopagoPreference
        );

        const itemIds = await purchaseOrderModel.addItems(
            purchaseOrderId,
            items
        );

        // retrieve data
        const purchaseOrder = await purchaseOrderModel.getPurchaseOrder(
            purchaseOrderId
        );

        purchaseOrder.items = await purchaseOrderModel.getPurchaseOrderItems(
            purchaseOrderId
        );

        // send email with instructions
        const paymentOption = await paymentOptionModel.getPaymentOption(
            paymentOptionId
        );

        const shippingOption = await shippingOptionModel.getShippingOption(
            shippingOptionId
        );

        const itemsFetched = await purchaseOrderModel.getPurchaseOrderItems(
            purchaseOrderId
        );

        emailHelper.sendPurchaseInstructions(
            callRequest,
            purchaseOrder,
            itemsFetched,
            paymentOption,
            shippingOption,
            store
        );

        const status = 200;
        res.send({ status, data: purchaseOrder });
    } catch (err) {
        err.status = 500;
        return next(err);
    }
};

const deletePurchaseOrder = async (req, res, next) => {
    // authorization
    try {
        const hasAccess = req.authorization.storeUser.thisStore;

        if (!hasAccess) {
            throw new Error('Unauthorized.');
        }
    } catch (err) {
        let myErr = new Error('Unauthorized.');
        myErr.status = 401;
        return next(myErr);
    }

    // check if call request is called
    const { callRequestId, purchaseOrderId } = req.params;
    const callRequest = await callRequestModel.getCallRequest(callRequestId);

    if (!callRequest) {
        throw new Error('Call request not found.');
    }

    if (callRequest.state !== CALLED) {
        const err = new Error('The call request is not in CALLED state.');
        err.status = 400;
        return next(err);
    }

    // delete purchase order
    await purchaseOrderModel.deletePurchaseOrder(purchaseOrderId);

    const status = 200;
    res.send({ status });
};

const getPurchaseOrders = async (req, res, next) => {
    // authorization
    try {
        const hasAccess = req.authorization.storeUser.thisStore;

        if (!hasAccess) {
            throw new Error('Unauthorized.');
        }
    } catch (err) {
        let myErr = new Error('Unauthorized.');
        myErr.status = 401;
        return next(myErr);
    }

    // retrieve data
    const { callRequestId } = req.params;
    const purchaseOrders = await purchaseOrderModel.getPurchaseOrdersByCallRequestId(
        callRequestId
    );

    await Promise.all(
        purchaseOrders.map(async purchaseOrder => {
            purchaseOrder.items = await purchaseOrderModel.getPurchaseOrderItems(
                purchaseOrder.purchaseOrderId
            );

            return purchaseOrder;
        })
    );

    const status = 200;
    res.send({ status, data: purchaseOrders });
};

module.exports = {
    createPurchaseOrder,
    getPurchaseOrders,
    deletePurchaseOrder,
};
