import express from 'express';
import { configureApp } from './api/app.js';
import { validateProductionConfig } from './api/config.js';

validateProductionConfig();

export default configureApp(express());
