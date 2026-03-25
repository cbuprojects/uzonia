# ------------------------------------------------------------------------
    # Calculating first way
    # ------------------------------------------------------------------------
    uzonia_calculation_way = 0
    if total_value >= 500000000000 and len(repos_data_list) >= 5:
        logger.info("add_new_uzonia_calculation | Using calculation way 1 (total_value=%s, repos_count=%d)",
                    total_value, len(repos_data_list))
        ten_percent_value = (total_value / 100) * 10
        day_uzonia = await calculate_day_uzonia(ten_percent_value, repos_data_list)
        uzonia_calculation_way = 1
        print(f'Calculate day uzonia: {day_uzonia} with 1 way')
    else:
        logger.info(
            "add_new_uzonia_calculation | Falling back to calculation way 2 or 3 (total_value=%s, repos_count=%d)",
            total_value, len(repos_data_list))
        applications_deposit = deposit_file_data['Код сделки'].astype(str).str.strip().unique().tolist()
        logger.info("add_new_uzonia_calculation | Found %d unique deposit applications", len(applications_deposit))
        print(f'Number of applications: {applications_deposit}')
        for application in applications_deposit:
            for index, row in deposit_file_data.iterrows():
                if application == row['Код сделки']:
                    applications_deposit.remove(application)
                    repos_data_list.append([row['Код сделки'], row['Процентная ставка'], row['Сумма']])
        print(f'Repo data list: {repos_data_list}')

        # Sorting by rate (ascending)
        repos_data_list.sort(key=lambda x: x[1])
        total_value = 0
        for row_data in repos_data_list:
            total_value += row_data[2]
        logger.info("add_new_uzonia_calculation | Total value after adding deposits: %s", total_value)



        # ------------------------------------------------------------------------
        # Calculating second way
        # ------------------------------------------------------------------------
        if total_value >= 500000000000:
            logger.info("add_new_uzonia_calculation | Using calculation way 2 (total_value=%s)", total_value)
            ten_percent_value = (total_value / 100) * 10
            day_uzonia = await calculate_day_uzonia(ten_percent_value, repos_data_list)
            uzonia_calculation_way = 2
            print(f'Calculate day uzonia: {day_uzonia} with 2 way')
        else:

            # ------------------------------------------------------------------------
            # Calculating third way
            # ------------------------------------------------------------------------
            logger.info("add_new_uzonia_calculation | Using calculation way 3 (total_value=%s, cb_deposit=%s)",
                        total_value, cb_deposit)
            cb_deposit_10_percent = (cb_deposit / 100) * 10
            random_application_number = random.randint(100000, 999999)
            logger.info("add_new_uzonia_calculation | Adding random application %d with rate=%s and amount=%s",
                        random_application_number, cb_rate, cb_deposit_10_percent)
            repos_data_list.append([random_application_number, cb_rate, cb_deposit_10_percent])

            # Sorting by rate (ascending)
            repos_data_list.sort(key=lambda x: x[1])
            total_value += cb_deposit_10_percent

            ten_percent_value = (total_value / 100) * 10
            day_uzonia = await calculate_day_uzonia(ten_percent_value, repos_data_list)
            uzonia_calculation_way = 3
            print(f'Calculate day uzonia: {day_uzonia} with 3 way')

    final_uzonia_data_dict = {'day_uzonia': day_uzonia, 'uzonia_calculation_way': uzonia_calculation_way}
    logger.info("add_new_uzonia_calculation | Calculated day_uzonia=%s using way %d", day_uzonia, uzonia_calculation_way)

    days_n_uzonias = [7, 30, 90, 180]
    for day_n_uzonia in days_n_uzonias:
        logger.info("add_new_uzonia_calculation | Calculating %d-day uzonia", day_n_uzonia)
        day_n_uzonias_list = await get_n_uzonia_data(days_number=day_n_uzonia)
        total_multiplied_uzonia_value = 0
        for day_n_uzonia_value in day_n_uzonias_list:
            total_multiplied_uzonia_value *= (1 + (day_n_uzonia_value / (365 * 100)))
        total_multiplied_uzonia_value -= 1
        n_day_final_uzonia_value = (total_multiplied_uzonia_value * (365 / day_n_uzonia) * 100)
        final_uzonia_data_dict[f'day_{day_n_uzonia}_uzonia'] = n_day_final_uzonia_value
        print(f'Calculated {day_n_uzonia} uzonia: {n_day_final_uzonia_value}')
        logger.info("add_new_uzonia_calculation | Calculated %d-day uzonia: %s", day_n_uzonia, n_day_final_uzonia_value)

    print(f'Final Uzonia: {final_uzonia_data_dict}')
    logger.info("add_new_uzonia_calculation | Final uzonia data dictionary created")

    uzonia_index = (1 + (day_uzonia / (365 * 100)))
    final_uzonia_data_dict['index'] = uzonia_index
    final_uzonia_data_dict['uzonia_date'] = cb_date
    logger.info("add_new_uzonia_calculation | Calculated index=%s for date=%s", uzonia_index, cb_date)



    # ------------------------------------------------------------------------------------------------------------------
    # Adding Uzonia to the DB
    # ------------------------------------------------------------------------------------------------------------------
    logger.info("add_new_uzonia_calculation | Adding uzonia data to database for date=%s", cb_date)

    result = await add_new_uzonia_data(file_id=file_id, rate=cb_rate, uzonia=final_uzonia_data_dict['day_uzonia'],
                                       day_7_uzonia=final_uzonia_data_dict['day_7_uzonia'],
                                       day_30_uzonia=final_uzonia_data_dict['day_30_uzonia'],
                                       day_90_uzonia=final_uzonia_data_dict['day_90_uzonia'],
                                       day_180_uzonia=final_uzonia_data_dict['day_180_uzonia'],
                                       index=final_uzonia_data_dict['index'],
                                       uzonia_date=final_uzonia_data_dict['uzonia_date'])
    if not result:
        logger.error("add_new_uzonia_calculation | Failed to add uzonia data to database for date=%s", cb_date)
        raise HTTPException(status_code=404, detail="❌ Could not add new uzonia data!")
    logger.info("add_new_uzonia_calculation | Successfully added uzonia data to database for date=%s", cb_date)



    # ------------------------------------------------------------------------------------------------------------------
    # Gathering Uzonia Data
    # ------------------------------------------------------------------------------------------------------------------
    logger.info("add_new_uzonia_calculation | Gathering previous uzonia data...")

    from_date = date(cb_date.year - 1, 1, 1)
    logger.info("add_new_uzonia_calculation | Fetching filtered image data from %s", from_date)
    filtered_image_data = await get_date_filtered_rate_uzonia(from_date=from_date)
    if not filtered_image_data:
        logger.error("add_new_uzonia_calculation | Failed to get previous data from %s", from_date)
        raise HTTPException(status_code=404, detail="❌ Could not get previous data")
    logger.info("add_new_uzonia_calculation | Retrieved %d records for filtered image data", len(filtered_image_data))

    logger.info("add_new_uzonia_calculation | Fetching time period uzonia data for date=%s", cb_date)
    time_period_uzonia_data = await get_time_period_uzonia_data(cb_date=cb_date)
    if not time_period_uzonia_data:
        logger.error("add_new_uzonia_calculation | Failed to get previous uzonia data for date=%s", cb_date)
        raise HTTPException(status_code=404, detail="❌ Could not get previous uzonia data")
    logger.info("add_new_uzonia_calculation | Retrieved %d records for time period data", len(time_period_uzonia_data))

    logger.info("add_new_uzonia_calculation | Building uzonia table data...")
    final_uzonia_table_data_dict = await finding_time_uzonia_calculations_func(cb_date=cb_date,
                                                                               db_time_data=time_period_uzonia_data,
                                                                               current_uzonia_calculations_dict=final_uzonia_data_dict)

    if not final_uzonia_table_data_dict:
        logger.error("add_new_uzonia_calculation | Failed to build uzonia table data for date=%s", cb_date)
        raise HTTPException(status_code=404, detail="❌ Could not build uzonia table data")
    logger.info("add_new_uzonia_calculation | Uzonia table data built successfully")



    # ------------------------------------------------------------------------------------------------------------------
    # Adding File Path to the DB
    # ------------------------------------------------------------------------------------------------------------------
    logger.info("add_new_uzonia_calculation | Adding file path to database for file_id=%s", file_id)
    file_uploaded = await add_new_uzonia_upload(file_id=file_id, file_path=f'data/output_data/{file_id}/',
                                                status='progress', file_date=cb_date)
    if not file_uploaded:
        logger.error("add_new_uzonia_calculation | Failed to add file to database for file_id=%s", file_id)
        raise HTTPException(status_code=404, detail="❌ Could not add file to the DB")
    logger.info("add_new_uzonia_calculation | File path added successfully for file_id=%s", file_id)



    # ------------------------------------------------------------------------------------------------------------------
    # Drawing Image
    # ------------------------------------------------------------------------------------------------------------------
    logger.info("add_new_uzonia_calculation | Drawing graph for file_id=%s", file_id)
    output_image_file_path = f'data/output_data/{file_id}/{file_id}.png'
    image_file_path = draw_graph_data(filtered_image_data, background_path="data/input_data/image/background_image.png",
                                      output_path=output_image_file_path)
    if not image_file_path:
        logger.error("add_new_uzonia_calculation | Failed to draw graph for file_id=%s", file_id)
        raise HTTPException(status_code=404, detail="❌ Could not draw graph")
    logger.info("add_new_uzonia_calculation | Graph drawn successfully at %s", image_file_path)

    logger.info("add_new_uzonia_calculation | Drawing table data for file_id=%s", file_id)
    image_file_path = draw_table_data(final_uzonia_table_data_dict, input_path=image_file_path,
                                      output_path=image_file_path)
    if not image_file_path:
        logger.error("add_new_uzonia_calculation | Failed to draw table for file_id=%s", file_id)
        raise HTTPException(status_code=404, detail="❌ Could not draw table")
    logger.info("add_new_uzonia_calculation | Table data drawn successfully at %s", image_file_path)



    # ------------------------------------------------------------------------------------------------------------------
    # Building Excel File
    # ------------------------------------------------------------------------------------------------------------------
    logger.info("add_new_uzonia_calculation | Fetching all uzonia data history...")
    all_uzonia_data_history = await get_all_uzonia_data()
    if not all_uzonia_data_history:
        logger.error("add_new_uzonia_calculation | Failed to get all uzonia data history")
        raise HTTPException(status_code=404, detail="❌ Could not get all uzonia data")
    logger.info("add_new_uzonia_calculation | Retrieved %d records from uzonia data history",
                len(all_uzonia_data_history))

    logger.info("add_new_uzonia_calculation | Building Excel file for file_id=%s", file_id)
    excel_file_path = export_uzonia_to_excel(data=all_uzonia_data_history,
                                             output_path=f'data/output_data/{file_id}/{file_id}.xlsx')
    if not excel_file_path:
        logger.error("add_new_uzonia_calculation | Failed to build Excel file for file_id=%s", file_id)
        raise HTTPException(status_code=404, detail="❌ Could not build excel file")
    logger.info("add_new_uzonia_calculation | Excel file built successfully at %s", excel_file_path)



    # ------------------------------------------------------------------------------------------------------------------
    # Building Excel File
    # ------------------------------------------------------------------------------------------------------------------
    logger.info("add_new_uzonia_calculation | Zipping folder for file_id=%s", file_id)
    zip_folder_path = zip_and_delete_folder(folder_path=f'data/output_data/{file_id}/',
                                            zip_name=f'data/output_data/{file_id}/')
    if not zip_folder_path:
        logger.error("add_new_uzonia_calculation | Failed to zip folder for file_id=%s", file_id)
        raise HTTPException(status_code=404, detail="❌ Could not zip folder")
    logger.info("add_new_uzonia_calculation | Folder zipped successfully at %s", zip_folder_path)



    # ------------------------------------------------------------------------------------------------------------------
    # Updating File Status
    # ------------------------------------------------------------------------------------------------------------------

    updated_file_status = await edit_uzonia_upload_status(status='finished', finished_at=datetime.now(tz), file_id=file_id)
    if not updated_file_status:
        logger.error("add_new_uzonia_calculation | Failed to update file status for file_id=%s", file_id)
        raise HTTPException(status_code=404, detail="❌ Could not update file status")
    logger.info("add_new_uzonia_calculation | Updated file status successfully for file_id=%s, date=%s", file_id,
                cb_date)



    # ------------------------------------------------------------------------------------------------------------------
    # Returning Everything
    # ------------------------------------------------------------------------------------------------------------------
    logger.info("add_new_uzonia_calculation | Calculation completed successfully for file_id=%s, date=%s", file_id,
                cb_date)

    return {
        'file_id': file_id,
        'calculation_way': final_uzonia_data_dict['calculation_way'],
        'uzonia_date': final_uzonia_data_dict['uzonia_date'],
        'uzonia': final_uzonia_data_dict['uzonia'],
        'day_7_uzonia': final_uzonia_data_dict['day_7_uzonia'],
        'day_30_uzonia': final_uzonia_data_dict['day_30_uzonia'],
        'day_90_uzonia': final_uzonia_data_dict['day_90_uzonia'],
        'day_180_uzonia': final_uzonia_data_dict['day_180_uzonia'],
        'index': final_uzonia_data_dict['index'],
        'output_file_path': zip_folder_path,
        'filename': f"{file_id}.zip",
        'media_type': 'application/zip'
    }
